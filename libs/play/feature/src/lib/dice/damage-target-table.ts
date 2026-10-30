import type { PickerSort, TableColumn } from '@pioneer/frontier/data';
import { DAMAGE_GROUP_TYPES, DamageGroup } from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget, DamageType } from '@pioneer/rules/sdk';
import { RulesTableSchema } from '@pioneer/rules/ui';
import type { Chip } from '@pioneer/rules/ui';

/**
 * What a damage target's category column says: a group is a group, an area or splash source is a source; a type is
 * physical, energy or neither.
 */
export const TargetCategory = {
  Group: 'group',
  Source: 'source',
  Physical: 'physical',
  Energy: 'energy',
  Other: 'other',
} as const;
export type TargetCategory = (typeof TargetCategory)[keyof typeof TargetCategory];

/** One damage type or group to pick, named, with the types a group covers. */
export interface DamageTargetRow {
  readonly value: DamageAdjustmentTarget;
  readonly label: string;
  readonly category: TargetCategory;
  /** The names of the types a group covers; empty for a type. */
  readonly includes: readonly string[];
}

/** What a column header says, in the active language. */
export interface DamageTargetHeaders {
  readonly name: string;
  readonly category: string;
  readonly includes: string;
}

const GROUP_CATEGORY: Readonly<Record<DamageGroup, TargetCategory>> = {
  [DamageGroup.All]: TargetCategory.Group,
  [DamageGroup.Physical]: TargetCategory.Group,
  [DamageGroup.Energy]: TargetCategory.Group,
};

/** The category a damage type falls in, by the group that lists it. */
export function categoryOf(type: DamageType): TargetCategory {
  if (DAMAGE_GROUP_TYPES[DamageGroup.Physical].includes(type)) {
    return TargetCategory.Physical;
  }
  return DAMAGE_GROUP_TYPES[DamageGroup.Energy].includes(type) ? TargetCategory.Energy : TargetCategory.Other;
}

/** The category of a group. */
export const categoryOfGroup = (group: DamageGroup): TargetCategory => GROUP_CATEGORY[group];

/** The types a group covers; `all` covers every type, which the row says by listing none. */
export function typesOf(group: DamageGroup): readonly DamageType[] {
  return group === DamageGroup.All ? [] : DAMAGE_GROUP_TYPES[group];
}

export const targetValue = (row: DamageTargetRow): DamageAdjustmentTarget => row.value;
export const targetLabel = (row: DamageTargetRow): string => row.label;

/** How a row orders by a column, before the name settles a tie. */
function orderBy(left: DamageTargetRow, right: DamageTargetRow, column: string): number {
  if (column === 'category') {
    return left.category.localeCompare(right.category);
  }
  return column === 'includes' ? left.includes.length - right.includes.length : 0;
}

/** The rows whose name holds `query`, in the order asked for; the list is short, so the caller holds all of it. */
export function shownTargets(
  rows: readonly DamageTargetRow[],
  query: string,
  sort: PickerSort | undefined,
): readonly DamageTargetRow[] {
  const needle = query.trim().toLocaleLowerCase();
  const matching = rows.filter((row) => row.label.toLocaleLowerCase().includes(needle));
  if (sort === undefined) {
    return matching;
  }
  const direction = sort.descending ? -1 : 1;
  return matching.toSorted(
    (left, right) => direction * (orderBy(left, right, sort.column) || left.label.localeCompare(right.label)),
  );
}

const chips = (labels: readonly string[]): readonly Chip[] => labels.map((label): Chip => ({ label }));

/** The columns of a damage target picker: the name, its category, and for a group the types it covers. */
export function damageTargetColumns(
  headers: DamageTargetHeaders,
  categoryName: (category: TargetCategory) => string,
): readonly TableColumn<DamageTargetRow>[] {
  return new RulesTableSchema<DamageTargetRow>()
    .addText({ id: 'name', header: headers.name, value: (row) => row.label, width: 'md' })
    .addTraits({
      id: 'category',
      header: headers.category,
      value: (row) => chips([categoryName(row.category)]),
      width: 'sm',
    })
    .addTraits({
      id: 'includes',
      header: headers.includes,
      value: (row) => chips(row.includes),
      width: 'lg',
    })
    .build();
}
