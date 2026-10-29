import type { TranslocoService } from '@jsverse/transloco';
import { itemRunes, propertyRoom, runedItemOf } from '@pioneer/character/domain';
import type {
  InventoryItem,
  InventoryItemId,
  ItemEntry,
  RunedContent,
  RuneEntry,
  RuneRef,
} from '@pioneer/character/domain';
import type { TableColumn } from '@pioneer/frontier/data';
import { RuneType } from '@pioneer/rules/sdk';
import type { FundamentalRune, Price, RichText, RunedItem } from '@pioneer/rules/sdk';
import { ItemTableSchema } from '@pioneer/rules/ui';
import type { Chip } from '@pioneer/rules/ui';

import type { RowOrder } from '../picker-rows';
import { gradeChoices } from './rune-options';
import { gradeLabel, runeLabel } from './rune-text';

/** One rune to pick: its name, whether it is fundamental or a property rune, its level, effect and price, and the slot it uses. */
export interface RuneRow {
  readonly value: string;
  readonly label: string;
  /** "Fundamental" or "Property", already translated. */
  readonly kind: string;
  /** The rune's level; 0 for no rune at all. */
  readonly level: number;
  readonly effect: RichText;
  readonly price: Price | undefined;
  /** The property slots it takes: one for a property rune, none for a fundamental one. */
  readonly slots: number;
}

/** What a column header says, in the active language. */
export interface RuneHeaders {
  readonly name: string;
  readonly kind: string;
  readonly level: string;
  readonly effect: string;
  readonly price: string;
  readonly slots: string;
  /** What the slot meter counts. */
  readonly slotsUsed: string;
}

const NO_EFFECT: RichText = [];
const ONE_SLOT = 1;

/** How the rune rows are searched and sorted. */
export const RUNE_ORDER: RowOrder<RuneRow> = {
  text: (row) => `${row.label} ${row.kind}`,
  sortKey: { name: (row) => row.label, kind: (row) => row.kind, level: (row) => row.level, slots: (row) => row.slots },
};

/** The columns of a rune picker: the name, its kind, level, effect, price, and the property slot it uses. */
export function runeColumns(headers: RuneHeaders): readonly TableColumn<RuneRow>[] {
  return new ItemTableSchema<RuneRow>()
    .addText({ id: 'name', header: headers.name, value: (row) => row.label, width: 'md' })
    .addTraits({
      id: 'kind',
      header: headers.kind,
      value: (row): readonly Chip[] => [{ label: row.kind }],
      width: 'sm',
    })
    .addLevel({ id: 'level', header: headers.level, value: (row) => row.level, width: 'sm' })
    .addSummary({ id: 'effect', header: headers.effect, value: (row) => row.effect, width: 'lg' })
    .addPrice({ id: 'price', header: headers.price, value: (row) => row.price, width: 'sm' })
    .addCount({
      id: 'slots',
      header: headers.slots,
      label: headers.slotsUsed,
      value: (row) => row.slots,
      max: () => ONE_SLOT,
      width: 'sm',
    })
    .build();
}

export const runeValue = (row: RuneRow): string => row.value;
export const runeRowLabel = (row: RuneRow): string => row.label;

/** The words a rune row says, translated. */
export interface RuneWords {
  readonly fundamental: string;
  readonly property: string;
}

/** What a rune row shows before its content is looked up. */
interface Shown {
  readonly value: string;
  readonly label: string;
  readonly kind: string;
  readonly slots: number;
}

/** The row for `shown`, with its level, effect and price from `entry`; none of them when no content has it. */
function rowOf(entry: RuneEntry | undefined, shown: Shown): RuneRow {
  return {
    value: shown.value,
    label: shown.label,
    kind: shown.kind,
    slots: shown.slots,
    level: entry === undefined ? 0 : entry.level,
    effect: entry === undefined ? NO_EFFECT : entry.description,
    price: entry?.data.price,
  };
}

/** Which fundamental rune a content entry is looked up for: the rune, its grade and the kind of item it goes on. */
interface FundamentalSpec {
  readonly rune: FundamentalRune;
  readonly grade: number;
  readonly runed: RunedItem | undefined;
}

/** The content entry of a fundamental rune at a grade, for the kind of item it goes on. */
function fundamentalEntry({ runes }: RunedContent, spec: FundamentalSpec): RuneEntry | undefined {
  return [...runes.values()].find(
    ({ data }) =>
      data.type === RuneType.Fundamental &&
      data.rune === spec.rune &&
      data.grade === spec.grade &&
      data.etchedOnto.item === spec.runed,
  );
}

/** What a grade picker says of "no rune": its own value and name, already worked out by the caller. */
export interface NoRune {
  readonly value: string;
  readonly label: string;
}

/**
 * The rows of `rune`'s grade picker: none (or a specific item's grade as it comes), then each grade that can be
 * etched, with the level, effect and price of the rune content that grade is.
 */
export function gradeRows(
  content: RunedContent,
  args: {
    readonly rune: FundamentalRune;
    readonly entry: ItemEntry | undefined;
    readonly none: NoRune;
    readonly words: RuneWords;
  },
  i18n: TranslocoService,
): readonly RuneRow[] {
  const { rune, entry, none, words } = args;
  const runed = runedItemOf(entry);
  const noneRow = rowOf(undefined, { value: none.value, label: none.label, kind: words.fundamental, slots: 0 });
  const grades = gradeChoices(rune, entry).map((grade) =>
    rowOf(fundamentalEntry(content, { rune, grade, runed }), {
      value: String(grade),
      label: gradeLabel(i18n, rune, grade),
      kind: words.fundamental,
      slots: 0,
    }),
  );
  return [noneRow, ...grades];
}

/** The rows of the property runes in `entries`, named as the content names them. */
export function propertyRows(entries: readonly RuneEntry[], words: RuneWords): readonly RuneRow[] {
  return entries.map((entry) =>
    rowOf(entry, { value: entry.id, label: entry.name, kind: words.property, slots: ONE_SLOT }),
  );
}

/** The rows of the runes etched onto `item`, keyed as the move form names them (`runeKey`). */
export function etchedRows(
  content: RunedContent,
  etched: {
    readonly item: InventoryItem | undefined;
    readonly entry: ItemEntry | undefined;
    readonly runes: readonly RuneRef[];
    readonly key: (rune: RuneRef) => string;
  },
  where: { readonly i18n: TranslocoService; readonly words: RuneWords },
): readonly RuneRow[] {
  const { item, entry, runes, key } = etched;
  const { i18n, words } = where;
  const runed = runedItemOf(entry);
  return runes.map((rune): RuneRow => {
    if (rune.type === RuneType.Property) {
      const label = runeLabel(i18n, content, { rune, grade: undefined });
      return rowOf(content.runes.get(rune.rune), { value: key(rune), label, kind: words.property, slots: ONE_SLOT });
    }
    const grade = item?.runes?.[rune.rune];
    const label = runeLabel(i18n, content, { rune, grade });
    const found = fundamentalEntry(content, { rune: rune.rune, grade: grade ?? 0, runed });
    return rowOf(found, { value: key(rune), label, kind: words.fundamental, slots: 0 });
  });
}

/** One item a rune can move onto: its name, what kind of item it is, and its property slots used against its room. */
export interface RuneTargetRow {
  readonly value: InventoryItemId;
  readonly label: string;
  /** Weapon, armour or shield, already translated. */
  readonly kind: string;
  /** The property runes etched onto it. */
  readonly used: number;
  /** How many it has room for. */
  readonly room: number;
}

/** What a target column header says, in the active language. */
export interface TargetHeaders {
  readonly name: string;
  readonly kind: string;
  readonly slots: string;
  readonly slotsUsed: string;
}

/** How the target rows are searched and sorted. */
export const TARGET_ORDER: RowOrder<RuneTargetRow> = {
  text: (row) => `${row.label} ${row.kind}`,
  sortKey: {
    name: (row) => row.label,
    kind: (row) => row.kind,
    slots: (row) => row.room - row.used,
  },
};

/** The columns of the rune move target picker: the item, its kind, and its property slots used out of its room. */
export function targetColumns(headers: TargetHeaders): readonly TableColumn<RuneTargetRow>[] {
  return new ItemTableSchema<RuneTargetRow>()
    .addText({ id: 'name', header: headers.name, value: (row) => row.label, width: 'md' })
    .addTraits({
      id: 'kind',
      header: headers.kind,
      value: (row): readonly Chip[] => [{ label: row.kind }],
      width: 'sm',
    })
    .addCount({
      id: 'slots',
      header: headers.slots,
      label: headers.slotsUsed,
      value: (row) => row.used,
      max: (row) => row.room,
      width: 'md',
    })
    .build();
}

export const targetValue = (row: RuneTargetRow): string => row.value;
export const targetRowLabel = (row: RuneTargetRow): string => row.label;

/** The property slots an item has used, and its room for them. */
export interface Slots {
  readonly used: number;
  readonly room: number;
}

/** The property slots `item` has used, and its room for them. */
export function slotsOf(item: InventoryItem | undefined, entry: ItemEntry | undefined): Slots {
  if (item === undefined) {
    return { used: 0, room: 0 };
  }
  const runes = itemRunes(item, entry);
  return { used: runes.property.length, room: propertyRoom(runes) };
}
