import type { BrowseRow } from '@pioneer/content/ui';
import { BrowseSources, LegacyBadge } from '@pioneer/content/ui';
import { PropertyKindId, tableFromProperties } from '@pioneer/frontier/data';
import type { PropertyDescriptor, TableColumn, TableFromPropertiesOptions, TableSchema } from '@pioneer/frontier/data';
import { FeatCategory, Rarity } from '@pioneer/rules/sdk';
import {
  ActionKind,
  CommonPropertyId,
  FEAT_PROPERTIES,
  FeatPropertyId,
  PickerCellMessage,
  RulesTableSchema,
  TRAITS_PROPERTY,
  viewProperties,
} from '@pioneer/rules/ui';
import type { FeatFacts } from '@pioneer/rules/ui';

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

/** What a row with no feat part reads: only a list of feats shows these columns, so no row is read through it. */
const NO_FEAT: FeatFacts = {
  id: '',
  name: '',
  level: undefined,
  traits: [],
  sources: [],
  category: FeatCategory.General,
  action: ActionKind.Passive,
  rarity: Rarity.Common,
  prerequisites: [],
  note: undefined,
};

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

/** Source and whether the entry is legacy, which close every list. */
function withSourceColumns<TSchema extends TableSchema<BrowseRow>>(schema: TSchema): TSchema {
  return schema
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

/** Traits, source and whether the entry is legacy, which close the table. */
function withClosingColumns(schema: RulesTableSchema<BrowseRow>): RulesTableSchema<BrowseRow> {
  return withSourceColumns(
    schema.addTraits({
      id: BrowseColumn.Traits,
      code: BrowseColumnCode.Traits,
      header: ColumnMessage.Traits,
      value: (row) => row.traits,
      hideable: true,
    }),
  );
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

/** The codes of the properties only a feat has; the common ones carry their own. */
const FEAT_COLUMN_CODES: ReadonlyMap<string, string> = new Map([
  [FeatPropertyId.Category, BrowseColumnCode.Category],
  [FeatPropertyId.Actions, BrowseColumnCode.Actions],
  [FeatPropertyId.Prerequisites, BrowseColumnCode.Prerequisites],
]);

/** The feat columns after the name and kind, in order; the source and legacy columns close the table. */
const FEAT_BROWSE_IDS: ReadonlyArray<string> = [
  FeatPropertyId.Level,
  FeatPropertyId.Category,
  FeatPropertyId.Actions,
  FeatPropertyId.Traits,
  FeatPropertyId.Prerequisites,
];

/** A feat property as a browser column: hideable but for the name, with the code a shared link names. */
function browseProperty(property: PropertyDescriptor<BrowseRow>): PropertyDescriptor<BrowseRow> {
  const hideable = property.id !== FeatPropertyId.Name;
  const code = FEAT_COLUMN_CODES.get(property.id);

  return code === undefined ? { ...property, hideable } : { ...property, code, hideable };
}

/** The browser's own kind column, which a list of one kind hides. */
function kindProperty(kindHidden: boolean): PropertyDescriptor<BrowseRow> {
  return {
    id: BrowseColumn.Kind,
    label: ColumnMessage.Kind,
    kind: PropertyKindId.Text,
    value: (row) => row.kind,
    code: BrowseColumnCode.Kind,
    hideable: true,
    defaultHidden: kindHidden,
  };
}

/**
 * `FEAT_PROPERTIES` as the browser's columns: read from the feat part of each row, every one but the name hideable
 * and carrying the code a shared link names. The traits are the row's own chips, already toned by rarity.
 */
function featProperties(kindHidden: boolean): ReadonlyArray<PropertyDescriptor<BrowseRow>> {
  const properties = FEAT_PROPERTIES.map((property) =>
    property.id === CommonPropertyId.Traits ? TRAITS_PROPERTY : property,
  );

  const viewed = viewProperties(properties, (row: BrowseRow) => row.feat ?? NO_FEAT).map((property) =>
    browseProperty(property),
  );

  return [...viewed, kindProperty(kindHidden)];
}

/**
 * The columns of a list of feats: the name, the kind, then the feat's level, category, action cost, traits and
 * prerequisites from `FEAT_PROPERTIES`, then the source and whether the entry is legacy.
 */
export function featBrowseColumns(
  kindHidden: boolean,
  options: TableFromPropertiesOptions,
): ReadonlyArray<TableColumn<BrowseRow>> {
  const ids = [FeatPropertyId.Name, BrowseColumn.Kind, ...FEAT_BROWSE_IDS];

  return withSourceColumns(tableFromProperties(featProperties(kindHidden), ids, options)).build();
}
