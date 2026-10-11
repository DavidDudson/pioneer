import { ContentText } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { langLabel } from './foundry-config';
import { labelAt } from './foundry-enricher';
import type { FoundryLang } from './foundry-release';

/**
 * Foundry's localisation keys (`PF2E.SpecificRule.Prompt.Skill`) resolved to their English text, so no imported text
 * shows a raw key. Foundry fills a label's `{item}` with its item's name, which the import knows; `{actor}`, `{origin}`
 * and a choice's `{flag}` are filled at play, and a key with an injected property (`{actor|class.slug}`) is only
 * built at play, so neither can be resolved here.
 */

/** A string that is wholly a lang key, as Foundry writes labels, prompts and notes. */
const LANG_KEY = /^PF2E\.\S+$/u;
/** An injected property in a key or text (`{actor|class.slug}`), resolved against the actor at play. */
const INJECTED = /\{[^}]*\|[^}]*\}/u;
/** A `format` placeholder (`{item}`); an enricher's label (`@UUID[…]{Prone}`) follows `]` and is not one. */
const PLACEHOLDER = /(?<!\])\{(?<name>\w+)\}/gu;
/** `@Localize[key]`, then Foundry's ignored `{label}`: the lang text is inlined and enriched in its place. */
const LOCALIZE = /@Localize\[(?<key>[^\]]+)\]/gu;
/** Lang text inlined by `@Localize` may itself use `@Localize`; Foundry recurses, this stops at a depth. */
const LOCALIZE_DEPTH = 4;

export const UnresolvedTextReason = {
  /** The lang table has no text for the key. */
  MissingKey: 'missing-key',
  /** The key has an injected property, so it names a different text per actor. */
  RuntimeKey: 'runtime-key',
  /** The text has a placeholder only play fills (`{actor}`). */
  RuntimePlaceholder: 'runtime-placeholder',
} as const;
export type UnresolvedTextReason = ValueOf<typeof UnresolvedTextReason>;

/** A lang key the import could not turn into text; the text is left out, never written as the key. */
export interface UnresolvedKey {
  readonly key: string;
  readonly reason: UnresolvedTextReason;
}

/** An unresolved key, reported against the entry whose text it is in. */
export interface UnresolvedText extends UnresolvedKey {
  readonly entry: ContentId;
}

/** What Foundry formats a label with that the import knows: the name of the document it is on. */
export interface LangValues {
  readonly item: string;
}

interface LocalizedText {
  readonly text: ContentText;
}

export type Localized = LocalizedText | UnresolvedKey;

/** Whether `text` is a lang key rather than words. */
export function isLangKey(text: string): boolean {
  return LANG_KEY.test(text);
}

/** `text` with its placeholders filled from `values`, or the first one only play can fill. */
function formatted(text: string, key: string, values: LangValues): Localized {
  const unfilled = [...text.matchAll(PLACEHOLDER)].find(({ groups }) => !Object.hasOwn(values, groups?.['name'] ?? ''));
  if (unfilled !== undefined) {
    return { key, reason: UnresolvedTextReason.RuntimePlaceholder };
  }
  const filled = ContentText.safeParse(text.replaceAll(PLACEHOLDER, () => values.item));
  return filled.success ? { text: filled.data } : { key, reason: UnresolvedTextReason.MissingKey };
}

/** The English text of a lang key, its placeholders filled, or why there is none. */
export function localize(lang: FoundryLang, key: string, values: LangValues): Localized {
  if (INJECTED.test(key)) {
    return { key, reason: UnresolvedTextReason.RuntimeKey };
  }
  const text = langLabel(lang, key);
  return text === undefined ? { key, reason: UnresolvedTextReason.MissingKey } : formatted(text, key, values);
}

export function isUnresolved(localized: Localized): localized is UnresolvedKey {
  return 'reason' in localized;
}

export interface ExpandedText {
  readonly text: string;
  readonly unresolved: readonly UnresolvedKey[];
}

interface ExpandContext {
  readonly lang: FoundryLang;
  readonly values: LangValues;
  readonly depth: number;
}

/** What one `@Localize` becomes: its key's text, expanded in turn, else its label or nothing. */
function expandedKey(key: string, label: string | undefined, context: ExpandContext): ExpandedText {
  const localized = localize(context.lang, key, context.values);
  if (isUnresolved(localized)) {
    return { text: label ?? '', unresolved: [localized] };
  }
  return context.depth >= LOCALIZE_DEPTH
    ? { text: localized.text, unresolved: [] }
    : expanded(localized.text, { ...context, depth: context.depth + 1 });
}

function expanded(html: string, context: ExpandContext): ExpandedText {
  const texts: string[] = [];
  const unresolved: UnresolvedKey[] = [];
  let from = 0;
  for (const match of html.matchAll(LOCALIZE)) {
    // A match inside the label of the one before is part of that label.
    if (match.index >= from) {
      const { label, end } = labelAt(html, match.index + match[0].length);
      const inner = expandedKey(match.groups?.['key'] ?? '', label, context);
      texts.push(html.slice(from, match.index), inner.text);
      unresolved.push(...inner.unresolved);
      from = end;
    }
  }
  texts.push(html.slice(from));
  return { text: texts.join(''), unresolved };
}

/**
 * Description HTML with each `@Localize[key]` replaced by its lang text, as Foundry renders it. A key that does not
 * resolve leaves its label, or nothing, and is reported.
 */
export function expandLocalize(html: string, lang: FoundryLang, values: LangValues): ExpandedText {
  return expanded(html, { lang, values, depth: 0 });
}

/** A lang table with dotted keys (`"PF2E.Kingmaker": {…}`) spread into nesting, as Foundry expands them. */
function put(table: Record<string, unknown>, key: string, value: unknown): void {
  const [head = key, ...rest] = key.split('.');
  if (rest.length > 0) {
    put(table, head, { [rest.join('.')]: value });
    return;
  }
  if (typeof value !== 'object' || value === null) {
    table[head] = value;
    return;
  }
  const existing = table[head];
  const nested: Record<string, unknown> = typeof existing === 'object' && existing !== null ? { ...existing } : {};
  for (const [child, childValue] of Object.entries(value)) {
    put(nested, child, childValue);
  }
  table[head] = nested;
}

/**
 * Foundry's lang files for one language merged in manifest order, a later file's string winning, as Foundry loads
 * them: `en.json`, then the actions, rule elements and Kingmaker tables.
 */
export function mergeLang(tables: readonly FoundryLang[]): FoundryLang {
  const merged: Record<string, unknown> = {};
  for (const table of tables) {
    for (const [key, value] of Object.entries(table)) {
      put(merged, key, value);
    }
  }
  return merged;
}
