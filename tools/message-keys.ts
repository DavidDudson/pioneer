/**
 * Pure helpers for the message key check (ADR-0009) and the translation catalogs (ADR-0084): flatten `en.json`
 * bundles into dotted keys, find key literals in source, compare, keep a locale's catalog in step with `en`, and
 * judge what a catalog gets wrong.
 */
import { icuProblem, parameterMismatch } from './icu-messages.ts';

/** A message bundle as authored: nested objects ending in ICU strings. */
export interface MessageTree {
  readonly [key: string]: MessageTree | string;
}

export interface KeyReport {
  /** Used in code, absent from `en`: the UI would show the raw key. */
  readonly missing: ReadonlyArray<string>;
  /** In `en`, used nowhere: dead text for translators to maintain. */
  readonly unused: ReadonlyArray<string>;
}

function isGroup(value: MessageTree | string): value is MessageTree {
  return value instanceof Object;
}

/** `{ list: { title: 'x' } }` with prefix `character` → `['character.list.title']`. */
export function flattenMessages(tree: MessageTree, prefix = ''): Array<string> {
  return Object.entries(tree).flatMap(([name, value]) => {
    const key = prefix === '' ? name : `${prefix}.${name}`;

    return isGroup(value) ? flattenMessages(value, key) : [key];
  });
}

/** A quoted identifier in TypeScript: `'character.list.title'`, `"problem.notFound"`. */
const TS_LITERAL = /['"`](?<literal>[a-z][\d.A-Za-z]*)['"`]/gu;

/** In templates double quotes delimit attribute expressions, so only single-quoted strings are literals. */
const HTML_LITERAL = /'(?<literal>[a-z][\d.A-Za-z]*)'/gu;

/** At least two non-empty dot-separated segments. */
function isDotted(literal: string): boolean {
  const segments = literal.split('.');

  return segments.length > 1 && segments.every((segment) => segment.length > 0);
}

export const SourceKind = {
  TypeScript: 'ts',
  Template: 'html',
} as const;

export type SourceKind = (typeof SourceKind)[keyof typeof SourceKind];

/** Key-shaped string literals whose first segment is a known message namespace. */
export function findKeyLiterals(source: string, kind: SourceKind, namespaces: ReadonlySet<string>): Array<string> {
  const pattern = kind === SourceKind.Template ? HTML_LITERAL : TS_LITERAL;

  return [...source.matchAll(pattern)]
    .values()
    .map((match) => match.groups?.['literal'] ?? '')
    .filter((literal) => isDotted(literal) && namespaces.has(literal.split('.')[0] ?? ''))
    .toArray();
}

export function compareKeys(defined: ReadonlySet<string>, used: ReadonlySet<string>): KeyReport {
  return {
    missing: [...used].filter((key) => !defined.has(key)).toSorted(),
    unused: [...defined].filter((key) => !used.has(key)).toSorted(),
  };
}

const SCOPE_CALL = /provideMessageScope\(\s*['"](?<scope>[\w-]+)['"]/u;

/** The scope a lib's messages load under, from its `provideMessageScope('<scope>', …)` call. */
export function scopeOf(sources: ReadonlyArray<string>): string | undefined {
  return sources.map((source) => SCOPE_CALL.exec(source)?.groups?.['scope']).find((scope) => scope !== undefined);
}

/** What a catalog holds for a message nobody has translated yet. At runtime it is absent, so `en` shows. */
export const UNTRANSLATED = '';

function isTranslated(message: string | undefined): message is string {
  return message !== undefined && message !== UNTRANSLATED;
}

/** Every message of a bundle by its dotted key, relative to the bundle (no scope prefix). */
export function messageEntries(tree: MessageTree, prefix = ''): ReadonlyMap<string, string> {
  const entries = new Map<string, string>();

  for (const [name, value] of Object.entries(tree)) {
    const key = prefix === '' ? name : `${prefix}.${name}`;

    if (isGroup(value)) {
      for (const [nested, message] of messageEntries(value, key)) {
        entries.set(nested, message);
      }
    } else {
      entries.set(key, value);
    }
  }

  return entries;
}

/**
 * A locale's catalog laid out like `en`: what it already translates is kept, a message `en` gained is added as
 * {@link UNTRANSLATED}, and a message `en` lost is dropped. Running it again changes nothing.
 */
export function syncCatalog(source: MessageTree, existing: MessageTree | undefined): MessageTree {
  return Object.fromEntries(
    Object.entries(source).map(([name, value]): [string, MessageTree | string] => {
      const kept = existing?.[name];

      if (isGroup(value)) {
        return [name, syncCatalog(value, kept !== undefined && isGroup(kept) ? kept : undefined)];
      }

      return [name, kept !== undefined && !isGroup(kept) ? kept : UNTRANSLATED];
    }),
  );
}

/** The parent language tags a regional tag falls back through before `en`: `pt-BR` → `['pt-BR', 'pt']`. */
export function localeChain(locale: string): ReadonlyArray<string> {
  const subtags = locale.split('-');

  return subtags.map((_subtag, index) => subtags.slice(0, subtags.length - index).join('-'));
}

/** Translated and total message counts. */
export interface Coverage {
  readonly translated: number;
  readonly total: number;
}

/** How much of `source` the catalogs of a fallback chain translate, the first in the chain winning. */
export function coverage(source: MessageTree, chain: ReadonlyArray<MessageTree>): Coverage {
  const wanted = [...messageEntries(source).keys()];
  const layers = chain.map((catalog) => messageEntries(catalog));
  const translated = wanted.filter((key) => layers.some((layer) => isTranslated(layer.get(key)))).length;

  return { translated, total: wanted.length };
}

/** Whether a catalog covers every message of `source`; a source with none is whole. */
export function isComplete({ translated, total }: Coverage): boolean {
  return translated === total;
}

/** Why a translated message is wrong next to its `en` original, or `undefined` when it is fine. */
function messageProblem(key: string, original: string, message: string): string | undefined {
  const syntax = icuProblem(message);

  if (syntax !== undefined) {
    return `invalid ICU in ${key}: ${syntax}`;
  }

  const mismatch = icuProblem(original) === undefined ? parameterMismatch(original, message) : undefined;

  if (mismatch === undefined) {
    return undefined;
  }

  const dropped = mismatch.dropped.map((name) => `drops {${name}}`);
  const added = mismatch.added.map((name) => `adds {${name}}`);

  return `parameters differ from en in ${key}: ${[...dropped, ...added].join(', ')}`;
}

/** What is wrong with one locale's catalog next to its `en` source; empty when nothing. Missing messages are not wrong. */
export function catalogProblems(source: MessageTree, catalog: MessageTree): ReadonlyArray<string> {
  const english = messageEntries(source);

  return [...messageEntries(catalog)].flatMap(([key, message]): Array<string> => {
    const original = english.get(key);

    if (original === undefined) {
      return [`stale key (not in en): ${key}`];
    }

    const problem = isTranslated(message) ? messageProblem(key, original, message) : undefined;

    return problem === undefined ? [] : [problem];
  });
}

/** Scopes whose messages every shipped locale must translate in full, besides the shell's root messages (ADR-0084). */
const CORE_SCOPES: ReadonlySet<string> = new Set(['identity', 'character']);

/** Whether every shipped locale must translate this scope in full. */
export function isCoreScope(scope: string | undefined): boolean {
  return scope === undefined || CORE_SCOPES.has(scope);
}
