import type { FocusLine, InnateLine, SpellRowLine } from '@pioneer/rules/ui';

import type { PreparedEntryFields } from './sheet-spell-picks';
import { passesTargetFilter } from './sheet-spell-targets';
import type { SpellTargetFilter } from './sheet-spell-targets';

/** Where the sheet's spell lines come from: each origin's own line, undefined where the character has none. */
export interface SpellOrigins {
  readonly focus: FocusLine | undefined;
  readonly innate: InnateLine | undefined;
  readonly prepared: readonly PreparedEntryFields[];
  /** The rows of the wands, staves and scrolls the character carries. */
  readonly items?: readonly SpellRowLine[];
}

/** The spells every origin holds, one line each, before they are sorted. */
function linesOf({ focus, innate, prepared, items = [] }: SpellOrigins): SpellRowLine[] {
  const fromFocus = (focus?.entries ?? []).flatMap((entry) =>
    entry.spells.flatMap(({ key, detail, use }) =>
      detail === undefined ? [] : [{ key: `focus:${entry.key}:${key}`, detail, use }],
    ),
  );
  const fromInnate = (innate?.entries ?? []).flatMap((entry) =>
    entry.spells.flatMap(({ key, detail, use }) =>
      detail === undefined ? [] : [{ key: `innate:${entry.key}:${key}`, detail, use }],
    ),
  );
  const fromPrepared = prepared.flatMap((entry) =>
    entry.ranks.flatMap((rank) =>
      rank.fields.flatMap((field) => {
        const detail = field.detail();
        return detail === undefined ? [] : [{ key: `prepared:${field.key}`, detail, use: field.use() }];
      }),
    ),
  );
  return [...fromFocus, ...fromInnate, ...fromPrepared, ...items];
}

/**
 * Every spell the character can cast as one list, whatever its origin (#1784): alphabetical by name, then by source,
 * each spell once per source and rank it is held at, and only those that pass `filter`. A prepared slot with no spell
 * yet is not in it; its picker is under the list.
 */
export function sheetSpellList(origins: SpellOrigins, filter: SpellTargetFilter): readonly SpellRowLine[] {
  const seen = new Set<string>();
  return linesOf(origins)
    .filter(({ detail }) => passesTargetFilter(detail, filter))
    .filter(({ detail }) => {
      const held = `${detail.id}|${detail.source ?? ''}|${detail.rank}`;
      const fresh = !seen.has(held);
      seen.add(held);
      return fresh;
    })
    .toSorted(
      (left, right) =>
        left.detail.name.localeCompare(right.detail.name) ||
        (left.detail.source ?? '').localeCompare(right.detail.source ?? ''),
    );
}
