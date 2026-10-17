import type { LinkTarget } from '@pioneer/frontier';
import { TableSchema } from '@pioneer/frontier/data';
import type { ColumnOptions, RowData } from '@pioneer/frontier/data';
import type { ContentId, RichText, SourceRef } from '@pioneer/rules/sdk';

import { SourceLineView } from '../source-line/source-line.component';
import { ActionCostCell } from './action-cost-cell/action-cost-cell.component';
import { ChipList } from './chip-list/chip-list.component';
import type { Chip } from './chip-list/chip-list.component';
import { CountMeter } from './count-meter/count-meter.component';
import { EntryNameCell } from './entry-name-cell/entry-name-cell.component';
import { LevelCell } from './level-cell/level-cell.component';
import { ActionKind } from './picker-cell-messages';
import { SummaryCell } from './summary-cell/summary-cell.component';

/** A column of one cell kind: its id, header and how to read the value from a row. */
export interface CellColumn<TRow, TValue> extends ColumnOptions {
  readonly id: string;
  readonly value: (row: TRow) => TValue;
}

/** A column of a count out of a total. */
export interface CountColumn<TRow> extends ColumnOptions {
  readonly id: string;
  /** What is counted, already translated. */
  readonly label: string;
  readonly value: (row: TRow) => number;
  readonly max: (row: TRow) => number;
}

/** A column of entry names, each linking to `to` when given and previewing the entry it names when `entry` is. */
export interface EntryNameColumn<TRow> extends ColumnOptions {
  readonly id: string;
  readonly value: (row: TRow) => string;
  readonly to?: (row: TRow) => LinkTarget;
  readonly entry?: (row: TRow) => ContentId;
}

/** Cheapest first: a free action, a reaction, then one to three actions, a cost that varies, none at all. */
const ACTION_ORDER: readonly ActionKind[] = [
  ActionKind.Free,
  ActionKind.Reaction,
  ActionKind.One,
  ActionKind.Two,
  ActionKind.Three,
  ActionKind.Variable,
  ActionKind.Time,
  ActionKind.Passive,
];

/** How a row with nothing to compare sorts: before everything else. */
export const NOTHING = -1;

function sortedLabels(chips: readonly Chip[]): string {
  return chips.map(({ label }) => label).join(' ');
}

/**
 * The steps every kind of picker row shares: each wraps one cell of this library and sorts by its own value. Kinds
 * of row extend it with the steps that suit them, and every step chains with the generic ones from frontier.
 */
export class RulesTableSchema<TRow extends RowData> extends TableSchema<TRow> {
  /** An action cost glyph, sorted cheapest first. */
  public addActions(options: CellColumn<TRow, ActionKind>): this {
    return this.addComponent({
      ...options,
      sortValue: (row) => ACTION_ORDER.indexOf(options.value(row)),
      component: ActionCostCell,
      inputs: (row) => ({ cost: options.value(row) }),
    });
  }

  /** An entry's name as a link to its page and a preview of the entry, sorted by the name. */
  public addEntryName(options: EntryNameColumn<TRow>): this {
    return this.addComponent({
      ...options,
      sortValue: options.value,
      component: EntryNameCell,
      inputs: (row) => ({ name: options.value(row), to: options.to?.(row), entry: options.entry?.(row) }),
    });
  }

  /** A level number. */
  public addLevel(options: CellColumn<TRow, number>): this {
    return this.addComponent({
      ...options,
      sortValue: options.value,
      component: LevelCell,
      inputs: (row) => ({ level: options.value(row) }),
    });
  }

  /** Trait chips, toned by rarity, sorted by their names. */
  public addTraits(options: CellColumn<TRow, readonly Chip[]>): this {
    return this.addChips(options);
  }

  /** Where an entry comes from: "Player Core p. 46 · AoN". */
  public addSource(options: CellColumn<TRow, readonly SourceRef[]>): this {
    return this.addComponent({
      ...options,
      sortValue: (row) => options.value(row).length,
      component: SourceLineView,
      inputs: (row) => ({ sources: options.value(row) }),
    });
  }

  /** A short rich-text summary, cut off after two lines. Not sortable unless asked. */
  public addSummary(options: CellColumn<TRow, RichText>): this {
    return this.addComponent({
      sortable: false,
      ...options,
      sortValue: () => NOTHING,
      component: SummaryCell,
      inputs: (row) => ({ text: options.value(row) }),
    });
  }

  /** A count out of a total as a meter, sorted by how full it is. */
  public addCount(options: CountColumn<TRow>): this {
    return this.addComponent({
      ...options,
      sortValue: (row) => options.value(row) / Math.max(options.max(row), 1),
      component: CountMeter,
      inputs: (row) => ({ value: options.value(row), max: options.max(row), label: options.label }),
    });
  }

  protected addChips(options: CellColumn<TRow, readonly Chip[]>): this {
    return this.addComponent({
      ...options,
      sortValue: (row) => sortedLabels(options.value(row)),
      component: ChipList,
      inputs: (row) => ({ chips: options.value(row) }),
    });
  }
}
