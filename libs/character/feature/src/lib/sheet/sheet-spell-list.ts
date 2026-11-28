import type { Signal } from '@angular/core';
import type { PickedPreparation } from '@pioneer/character/domain';
import type { MagicTradition } from '@pioneer/rules/sdk';
import type { SpellDetailLine, SpellRowLine, UsableLine } from '@pioneer/rules/ui';

import { filterSpells } from './sheet-spell-filter';
import type { SourcedSpell, SpellPicks } from './sheet-spell-filter';

/** What the list reads of a focus or innate spell. */
interface OriginSpell {
  readonly key: string;
  readonly detail: SpellDetailLine | undefined;
  readonly use?: UsableLine | undefined;
}

/** What the list reads of a focus or innate line: its entries, each with the spells it holds. */
interface OriginLine {
  readonly entries: ReadonlyArray<{ readonly key: string; readonly spells: ReadonlyArray<OriginSpell> }>;
}

/** What the list reads of a prepared or spontaneous entry's pickers. */
interface PreparedOrigin {
  readonly preparation: PickedPreparation;
  readonly tradition: MagicTradition;
  readonly ranks: ReadonlyArray<{
    readonly fields: ReadonlyArray<{
      readonly key: string;
      readonly detail: Signal<SpellDetailLine | undefined>;
      readonly use: Signal<UsableLine | undefined>;
    }>;
  }>;
}

/** Where the sheet's spell lines come from: each origin's own line, undefined where the character has none. */
export interface SpellOrigins {
  readonly focus: OriginLine | undefined;
  readonly innate: OriginLine | undefined;
  readonly prepared: ReadonlyArray<PreparedOrigin>;
  /** The rows of the wands, staves and scrolls the character carries. */
  readonly items?: ReadonlyArray<SpellRowLine>;
  /** The name of a prepared or spontaneous entry, which the source filter lists its spells under. */
  readonly preparedSource?: (entry: PreparedOrigin) => string;
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
function linesOf({ focus, innate, prepared, items = [], preparedSource }: SpellOrigins): Array<SourcedSpell> {
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
export function sheetSpells(origins: SpellOrigins): ReadonlyArray<SourcedSpell> {
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
export function sheetSpellList(origins: SpellOrigins, filter: SpellPicks): ReadonlyArray<SpellRowLine> {
  return filterSpells(sheetSpells(origins), filter).map(({ line }) => line);
}
