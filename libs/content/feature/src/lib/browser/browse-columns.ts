import type { BrowseRow } from '@pioneer/content/ui';
import { LegacyBadge } from '@pioneer/content/ui';
import type { TableColumn } from '@pioneer/frontier/data';
import { RulesTableSchema } from '@pioneer/rules/ui';

import { BrowseColumn, BrowseColumnCode } from './browse-column';

/** The message key of each column's header, spelled out in full so the key check sees them. */
const ColumnMessage = {
  Name: 'content.column.name',
  Kind: 'content.column.kind',
  Level: 'content.column.level',
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
function withCreatureColumns(
  schema: RulesTableSchema<BrowseRow>,
  say: (key: string) => string,
): RulesTableSchema<BrowseRow> {
  return schema
    .addText({
      id: BrowseColumn.Role,
      code: BrowseColumnCode.Role,
      header: say(ColumnMessage.Role),
      value: (row) => row.creature?.role ?? '',
      hideable: true,
    })
    .addSortedText({
      id: BrowseColumn.Size,
      code: BrowseColumnCode.Size,
      header: say(ColumnMessage.Size),
      value: (row) => row.creature?.size ?? '',
      sortValue: (row) => row.creature?.sizeOrder ?? NO_LEVEL,
      hideable: true,
    })
    .addSortedText({
      id: BrowseColumn.HitPoints,
      code: BrowseColumnCode.HitPoints,
      header: say(ColumnMessage.HitPoints),
      value: (row) => row.creature?.hitPoints.toString() ?? '',
      sortValue: (row) => row.creature?.hitPoints ?? NO_LEVEL,
      hideable: true,
    })
    .addSortedText({
      id: BrowseColumn.ArmorClass,
      code: BrowseColumnCode.ArmorClass,
      header: say(ColumnMessage.ArmorClass),
      value: (row) => row.creature?.armorClass.toString() ?? '',
      sortValue: (row) => row.creature?.armorClass ?? NO_LEVEL,
      hideable: true,
    });
}

/** Traits, source and whether the entry is legacy, which close the table. */
function withClosingColumns(
  schema: RulesTableSchema<BrowseRow>,
  say: (key: string) => string,
): RulesTableSchema<BrowseRow> {
  return schema
    .addTraits({
      id: BrowseColumn.Traits,
      code: BrowseColumnCode.Traits,
      header: say(ColumnMessage.Traits),
      value: (row) => row.traits,
      hideable: true,
    })
    .addSource({
      id: BrowseColumn.Source,
      code: BrowseColumnCode.Source,
      header: say(ColumnMessage.Source),
      value: (row) => row.sources,
      hideable: true,
    })
    .addComponent({
      id: BrowseColumn.Legacy,
      code: BrowseColumnCode.Legacy,
      header: say(ColumnMessage.Legacy),
      sortValue: (row) => (row.legacy ? 1 : 0),
      component: LegacyBadge,
      inputs: (row) => ({ legacy: row.legacy }),
      hideable: true,
    });
}

/**
 * The list's table columns. Every column but the name can be hidden; the kind starts hidden when the list holds one
 * kind, where it says the same on every row. A list with creatures adds their role, size, Hit Points and Armor Class.
 */
export function browseColumns(
  say: (key: string) => string,
  kindHidden: boolean,
  creatures: boolean,
): readonly TableColumn<BrowseRow>[] {
  const base = new RulesTableSchema<BrowseRow>()
    .addEntryName({
      id: BrowseColumn.Name,
      code: BrowseColumnCode.Name,
      header: say(ColumnMessage.Name),
      value: (row) => row.name,
      to: (row) => row.to,
      entry: (row) => row.entry,
    })
    .addText({
      id: BrowseColumn.Kind,
      code: BrowseColumnCode.Kind,
      header: say(ColumnMessage.Kind),
      value: (row) => row.kind,
      hideable: true,
      defaultHidden: kindHidden,
    })
    .addSortedText({
      id: BrowseColumn.Level,
      code: BrowseColumnCode.Level,
      header: say(ColumnMessage.Level),
      value: (row) => row.level,
      sortValue: (row) => row.levelValue ?? NO_LEVEL,
      hideable: true,
    });
  return withClosingColumns(creatures ? withCreatureColumns(base, say) : base, say).build();
}
