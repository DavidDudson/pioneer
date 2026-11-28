import type { BrowseRow } from '@pioneer/content/ui';
import { BrowseSources, LegacyBadge } from '@pioneer/content/ui';
import type { TableColumn } from '@pioneer/frontier/data';
import { PickerCellMessage, RulesTableSchema } from '@pioneer/rules/ui';

import { BrowseColumn, BrowseColumnCode } from './browse-column';

/** The message key of each column's header, spelled out in full so the key check sees them. */
const ColumnMessage = {
  Name: 'content.column.name',
  Kind: 'content.column.kind',
  Role: 'content.column.role',
  Size: 'content.column.size',
  HitPoints: 'content.column.hitPoints',
  ArmorClass: 'content.column.armorClass',
  Traits: 'content.column.traits',
  Source: 'content.column.source',
  Legacy: 'content.column.legacy',
} as const;

/** What a row with nothing to compare sorts by: before every level, creatures' -1 included. */
const NO_LEVEL = Number.NEGATIVE_INFINITY;

/** Creature columns: role, size, Hit Points and Armor Class, which a row of any other kind leaves empty. */
function withCreatureColumns(schema: RulesTableSchema<BrowseRow>): RulesTableSchema<BrowseRow> {
  return schema
    .addText({
      id: BrowseColumn.Role,
      code: BrowseColumnCode.Role,
      header: ColumnMessage.Role,
      value: (row) => row.creature?.role ?? '',
      hideable: true,
    })
    .addSortedText({
      id: BrowseColumn.Size,
      code: BrowseColumnCode.Size,
      header: ColumnMessage.Size,
      value: (row) => row.creature?.size ?? '',
      sortValue: (row) => row.creature?.sizeOrder ?? NO_LEVEL,
      hideable: true,
    })
    .addSortedText({
      id: BrowseColumn.HitPoints,
      code: BrowseColumnCode.HitPoints,
      header: ColumnMessage.HitPoints,
      value: (row) => row.creature?.hitPoints.toString() ?? '',
      sortValue: (row) => row.creature?.hitPoints ?? NO_LEVEL,
      hideable: true,
    })
    .addSortedText({
      id: BrowseColumn.ArmorClass,
      code: BrowseColumnCode.ArmorClass,
      header: ColumnMessage.ArmorClass,
      value: (row) => row.creature?.armorClass.toString() ?? '',
      sortValue: (row) => row.creature?.armorClass ?? NO_LEVEL,
      hideable: true,
    });
}

/** Traits, source and whether the entry is legacy, which close the table. */
function withClosingColumns(schema: RulesTableSchema<BrowseRow>): RulesTableSchema<BrowseRow> {
  return schema
    .addTraits({
      id: BrowseColumn.Traits,
      code: BrowseColumnCode.Traits,
      header: ColumnMessage.Traits,
      value: (row) => row.traits,
      hideable: true,
    })
    .addComponent({
      id: BrowseColumn.Source,
      code: BrowseColumnCode.Source,
      header: ColumnMessage.Source,
      sortValue: (row) => row.sources.length,
      component: BrowseSources,
      inputs: (row) => ({ sources: row.sources }),
      hideable: true,
    })
    .addComponent({
      id: BrowseColumn.Legacy,
      code: BrowseColumnCode.Legacy,
      header: ColumnMessage.Legacy,
      sortValue: (row) => (row.legacy ? 1 : 0),
      component: LegacyBadge,
      inputs: (row) => ({ legacy: row.legacy, replacedBy: row.replacedBy }),
      hideable: true,
    });
}

/**
 * The list's table columns. Every column but the name can be hidden; the kind starts hidden when the list holds one
 * kind, where it says the same on every row. A list with creatures adds their role, size, Hit Points and Armor Class.
 */
export function browseColumns(kindHidden: boolean, creatures: boolean): ReadonlyArray<TableColumn<BrowseRow>> {
  const base = new RulesTableSchema<BrowseRow>()
    .addEntryName({
      id: BrowseColumn.Name,
      code: BrowseColumnCode.Name,
      header: ColumnMessage.Name,
      value: (row) => row.name,
      to: (row) => row.to,
      entry: (row) => row.entry,
    })
    .addText({
      id: BrowseColumn.Kind,
      code: BrowseColumnCode.Kind,
      header: ColumnMessage.Kind,
      value: (row) => row.kind,
      hideable: true,
      defaultHidden: kindHidden,
    })
    .addSortedText({
      id: BrowseColumn.Level,
      code: BrowseColumnCode.Level,
      header: PickerCellMessage.LevelColumn,
      value: (row) => row.level,
      sortValue: (row) => row.levelValue ?? NO_LEVEL,
      hideable: true,
    });

  return withClosingColumns(creatures ? withCreatureColumns(base) : base).build();
}
