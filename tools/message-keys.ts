/**
 * Pure helpers for the message key check (ADR-0009): flatten `en.json`
 * bundles into dotted keys, find key literals in source, and compare.
 */

/** A message bundle as authored: nested objects ending in ICU strings. */
export interface MessageTree {
  readonly [key: string]: MessageTree | string;
}

export interface KeyReport {
  /** Used in code, absent from `en`: the UI would show the raw key. */
  readonly missing: readonly string[];
  /** In `en`, used nowhere: dead text for translators to maintain. */
  readonly unused: readonly string[];
}

/** `{ list: { title: 'x' } }` with prefix `character` → `['character.list.title']`. */
export function flattenMessages(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([name, value]) => {
    const key = prefix === '' ? name : `${prefix}.${name}`;
    return typeof value === 'string' ? [key] : flattenMessages(value, key);
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
export function findKeyLiterals(source: string, kind: SourceKind, namespaces: ReadonlySet<string>): string[] {
  const pattern = kind === SourceKind.Template ? HTML_LITERAL : TS_LITERAL;
  return [...source.matchAll(pattern)]
    .map((match) => match.groups?.['literal'] ?? '')
    .filter((literal) => isDotted(literal) && namespaces.has(literal.split('.')[0] ?? ''));
}

export function compareKeys(defined: ReadonlySet<string>, used: ReadonlySet<string>): KeyReport {
  return {
    missing: [...used].filter((key) => !defined.has(key)).toSorted(),
    unused: [...defined].filter((key) => !used.has(key)).toSorted(),
  };
}

const SCOPE_CALL = /provideMessageScope\(\s*['"](?<scope>[\w-]+)['"]/u;

/** The scope a lib's messages load under, from its `provideMessageScope('<scope>', …)` call. */
export function scopeOf(sources: readonly string[]): string | undefined {
  return sources.map((source) => SCOPE_CALL.exec(source)?.groups?.['scope']).find((scope) => scope !== undefined);
}
