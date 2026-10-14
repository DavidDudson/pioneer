import type { PickerSort, TableColumn } from '@pioneer/frontier/data';

import { ATTRIBUTE_MESSAGES } from '../attributes/attributes-messages';
import { SIZE_MESSAGES } from '../build-summary/build-summary-messages';
import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { OriginTableSchema } from '../picker-cells/origin-table-schema';
import { OriginPickerMessage } from './origin-picker-messages';
import { OriginPickerColumn } from './origin-picker-row';
import type { AncestryPickerRow, BackgroundPickerRow, HeritagePickerRow } from './origin-picker-row';

/** Reads a message key in the active language. */
export type Say = (key: string, params?: object) => string;

/** What a row needs to be picked, searched and sorted by name. */
interface NamedRow {
  readonly id: string;
  readonly name: string;
  readonly disabledReason: string | undefined;
}

export const originRowValue = (row: NamedRow): string => row.id;
export const originRowLabel = (row: NamedRow): string => row.name;
export const originRowDisabled = (row: NamedRow): string | undefined => row.disabledReason;

const chips = (labels: readonly string[]): readonly Chip[] => labels.map((label): Chip => ({ label }));

/** The name column every origin picker starts with. */
function withName<TRow extends NamedRow>(schema: OriginTableSchema<TRow>, say: Say): OriginTableSchema<TRow> {
  return schema.addText({
    id: OriginPickerColumn.Name,
    header: say(OriginPickerMessage.Name),
    value: (row) => row.name,
    width: 'md',
  });
}

/** What an ancestry is: its name, hit points, size and speed. */
function bodyColumns(say: Say): OriginTableSchema<AncestryPickerRow> {
  return withName(new OriginTableSchema<AncestryPickerRow>(), say)
    .addFacts({
      id: OriginPickerColumn.HitPoints,
      header: say(OriginPickerMessage.HitPoints),
      value: (row) => chips([say(OriginPickerMessage.HitPointsValue, { value: row.hitPoints })]),
      width: 'sm',
    })
    .addFacts({
      id: 'size',
      header: say(OriginPickerMessage.Size),
      sortable: false,
      value: (row) => chips([say(SIZE_MESSAGES[row.size])]),
      width: 'sm',
    })
    .addFacts({
      id: OriginPickerColumn.Speed,
      header: say(OriginPickerMessage.Speed),
      value: (row) => chips([say(OriginPickerMessage.SpeedValue, { value: row.speed })]),
      width: 'sm',
    });
}

/** What an ancestry gives and costs, then where it comes from. */
function givesColumns(schema: OriginTableSchema<AncestryPickerRow>, say: Say): OriginTableSchema<AncestryPickerRow> {
  return schema
    .addBoosts({
      id: 'boosts',
      header: say(OriginPickerMessage.Boosts),
      sortable: false,
      value: (row) => row.boosts,
      width: 'md',
    })
    .addFacts({
      id: 'flaws',
      header: say(OriginPickerMessage.Flaws),
      sortable: false,
      value: (row) => chips(row.flaws.map((flaw) => say(ATTRIBUTE_MESSAGES[flaw]))),
      width: 'sm',
    })
    .addFacts({
      id: 'languages',
      header: say(OriginPickerMessage.Languages),
      sortable: false,
      value: (row) => chips(row.languages),
      width: 'md',
    })
    .addTraits({
      id: 'traits',
      header: say(OriginPickerMessage.Traits),
      sortable: false,
      value: (row) => chips(row.traits),
      width: 'md',
    })
    .addSource({
      id: 'source',
      header: say(OriginPickerMessage.Source),
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    });
}

/** The columns of an ancestry picker: what a member is, then what it gives and costs, then where it comes from. */
export function ancestryPickerColumns(say: Say): readonly TableColumn<AncestryPickerRow>[] {
  return givesColumns(bodyColumns(say), say).build();
}

/** The columns of a heritage picker: its ancestry, what it does and what it grants. */
export function heritagePickerColumns(say: Say): readonly TableColumn<HeritagePickerRow>[] {
  return withName(new OriginTableSchema<HeritagePickerRow>(), say)
    .addFacts({
      id: 'ancestry',
      header: say(OriginPickerMessage.Ancestry),
      sortable: false,
      value: (row) => chips([row.ancestry ?? say(OriginPickerMessage.Versatile)]),
      width: 'sm',
    })
    .addSummary({
      id: 'summary',
      header: say(OriginPickerMessage.Summary),
      sortable: false,
      value: (row) => row.summary,
      width: 'lg',
    })
    .addFacts({
      id: 'grants',
      header: say(OriginPickerMessage.Grants),
      sortable: false,
      value: (row) => chips(row.grants),
      width: 'md',
    })
    .addSource({
      id: 'source',
      header: say(OriginPickerMessage.Source),
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    })
    .build();
}

/** The columns of a background picker: its boosts, the skill and Lore it trains, and the feat it grants. */
export function backgroundPickerColumns(say: Say): readonly TableColumn<BackgroundPickerRow>[] {
  return withName(new OriginTableSchema<BackgroundPickerRow>(), say)
    .addBoosts({
      id: 'boosts',
      header: say(OriginPickerMessage.Boosts),
      sortable: false,
      value: (row) => row.boosts,
      width: 'md',
    })
    .addFacts({
      id: 'skill',
      header: say(OriginPickerMessage.Skill),
      sortable: false,
      value: (row) => chips(row.skills),
      width: 'sm',
    })
    .addFacts({
      id: 'lore',
      header: say(OriginPickerMessage.Lore),
      sortable: false,
      value: (row) => chips(row.lores),
      width: 'sm',
    })
    .addFacts({
      id: 'feat',
      header: say(OriginPickerMessage.Feat),
      sortable: false,
      value: (row) => chips(row.feats),
      width: 'md',
    })
    .addFacts({
      id: 'notes',
      header: say(OriginPickerMessage.Notes),
      sortable: false,
      value: (row) => chips(row.note === undefined ? [] : [row.note]),
      width: 'md',
    })
    .addSource({
      id: 'source',
      header: say(OriginPickerMessage.Source),
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    })
    .build();
}

/** How an ancestry orders by a column: its hit points or speed, then name. */
function ancestryOrder(left: AncestryPickerRow, right: AncestryPickerRow, sort: PickerSort): number {
  if (sort.column === OriginPickerColumn.HitPoints) {
    return left.hitPoints - right.hitPoints;
  }
  if (sort.column === OriginPickerColumn.Speed) {
    return left.speed - right.speed;
  }
  return 0;
}

const byName = (left: NamedRow, right: NamedRow): number =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

/** The rows whose name holds `query`, in the order asked for; unsorted, in the order given. */
type ShownRows<TRow> = (rows: readonly TRow[], query: string, sort: PickerSort | undefined) => readonly TRow[];

/** Rows searched by name and sorted by `compare`, then by name. */
function shownBy<TRow extends NamedRow>(
  compare: (left: TRow, right: TRow, sort: PickerSort) => number,
): ShownRows<TRow> {
  return (rows, query, sort) => {
    const needle = query.trim().toLocaleLowerCase();
    const matching = rows.filter((row) => row.name.toLocaleLowerCase().includes(needle));
    if (sort === undefined) {
      return matching;
    }
    return matching.toSorted((left, right) => {
      const order = compare(left, right, sort) || byName(left, right);
      return sort.descending ? -order : order;
    });
  };
}

/** The ancestries whose name holds `query`, by name, hit points or speed when asked. */
export const shownAncestryRows: ShownRows<AncestryPickerRow> = shownBy(ancestryOrder);

/** The heritages whose name holds `query`, by name when asked. */
export const shownHeritageRows: ShownRows<HeritagePickerRow> = shownBy(() => 0);

/** The backgrounds whose name holds `query`, by name when asked. */
export const shownBackgroundRows: ShownRows<BackgroundPickerRow> = shownBy(() => 0);
