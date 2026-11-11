import type { FocusLine, InnateLine, SpellRowLine } from '@pioneer/rules/ui';

import { filterSpells } from './sheet-spell-filter';
import type { SourcedSpell, SpellPicks } from './sheet-spell-filter';
import type { PreparedEntryFields } from './sheet-spell-picks';

/** Where the sheet's spell lines come from: each origin's own line, undefined where the character has none. */
export interface SpellOrigins {
  readonly focus: FocusLine | undefined;
  readonly innate: InnateLine | undefined;
  readonly prepared: readonly PreparedEntryFields[];
  /** The rows of the wands, staves and scrolls the character carries. */
  readonly items?: readonly SpellRowLine[];
  /** The name of a prepared or spontaneous entry, which the source filter lists its spells under. */
  readonly preparedSource?: (entry: PreparedEntryFields) => string;
}

/** The name of the item a row is cast from, without the charges the row's source counts; undefined for a spell the character knows. */
function itemName({ item, detail }: SpellRowLine): string | undefined {
  if (item === undefined) {
    return undefined;
  }
  if (item.kind === 'wand') {
    return item.wand.name;
  }
  return item.kind === 'staff' ? item.staff : detail.source;
}

/** The spells every origin holds, one line each with what grants it, before they are sorted. */
function linesOf({ focus, innate, prepared, items = [], preparedSource }: SpellOrigins): SourcedSpell[] {
  const fromFocus = (focus?.entries ?? []).flatMap((entry) =>
    entry.spells.flatMap(({ key, detail, use }) =>
      detail === undefined ? [] : [{ line: { key: `focus:${entry.key}:${key}`, detail, use }, source: detail.source }],
    ),
  );
  const fromInnate = (innate?.entries ?? []).flatMap((entry) =>
    entry.spells.flatMap(({ key, detail, use }) =>
      detail === undefined ? [] : [{ line: { key: `innate:${entry.key}:${key}`, detail, use }, source: detail.source }],
    ),
  );
  const fromPrepared = prepared.flatMap((entry) =>
    entry.ranks.flatMap((rank) =>
      rank.fields.flatMap((field) => {
        const detail = field.detail();
        return detail === undefined
          ? []
          : [
              {
                line: { key: `prepared:${field.key}`, detail, use: field.use() },
                source: detail.source ?? preparedSource?.(entry),
              },
            ];
      }),
    ),
  );
  const fromItems = items.map((line): SourcedSpell => ({ line, source: itemName(line) ?? line.detail.source }));
  return [...fromFocus, ...fromInnate, ...fromPrepared, ...fromItems];
}

/**
 * Every spell the character can cast, whatever its origin (#1784): alphabetical by name, then by source, each spell once per
 * source and rank it is held at. A prepared slot with no spell yet is not in it; its picker is under the list.
 */
export function sheetSpells(origins: SpellOrigins): readonly SourcedSpell[] {
  const seen = new Set<string>();
  return linesOf(origins)
    .filter(({ line: { detail } }) => {
      const held = `${detail.id}|${detail.source ?? ''}|${detail.rank}`;
      const fresh = !seen.has(held);
      seen.add(held);
      return fresh;
    })
    .toSorted(
      (left, right) =>
        left.line.detail.name.localeCompare(right.line.detail.name) ||
        (left.line.detail.source ?? '').localeCompare(right.line.detail.source ?? ''),
    );
}

/** The spell rows of `origins` that pass `filter` (#1785). */
export function sheetSpellList(origins: SpellOrigins, filter: SpellPicks): readonly SpellRowLine[] {
  return filterSpells(sheetSpells(origins), filter).map(({ line }) => line);
}
