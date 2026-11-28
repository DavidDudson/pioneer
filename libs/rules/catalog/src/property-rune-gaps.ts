import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { loadRunes } from './rune-fixtures';

/** Property runes the play state models instead of rule elements, so their `rules` stay empty. */
export const MODELLED_IN_PLAY: ReadonlySet<string> = new Set([
  'rune:shifting',
  'rune:authorized',
  'rune:ready',
  'rune:ready-greater',
]);

/** Whether a rune is a property rune for `item` with no activation (those belong to the activations stories). */
function isPlainProperty(entry: ContentEntry, item: string): boolean {
  return (
    entry.kind === ContentKind.Rune &&
    entry.data.type === 'property' &&
    entry.data.etchedOnto.item === item &&
    entry.data.activations === undefined
  );
}

export const RUNES = await loadRunes();

/** Whether any pack's copy of the rune has rules: a legacy copy of a rune the remaster already covers needs none. */
function ruled(slug: string): boolean {
  return RUNES.some((entry) => entry.slug === slug && entry.rules.length > 0);
}

/** Plain property runes for `item` with neither rules nor a recorded gap. */
export function unaccounted(item: string, gaps: ReadonlySet<string>): ReadonlyArray<string> {
  return RUNES.filter((entry) => isPlainProperty(entry, item))
    .filter(
      (entry) =>
        entry.rules.length === 0 && !gaps.has(entry.slug) && !MODELLED_IN_PLAY.has(entry.slug) && !ruled(entry.slug),
    )
    .map((entry) => entry.slug);
}

/** Recorded gaps whose rune is gone or has since got rules. */
export function staleGaps(gaps: ReadonlySet<string>): ReadonlyArray<string> {
  return [...gaps].filter((slug) => {
    const rune = RUNES.find((entry) => entry.slug === slug);

    return rune === undefined || rune.rules.length > 0;
  });
}
