import { PropertyKindId } from '@pioneer/frontier/data';
import type { PropertyDescriptor } from '@pioneer/frontier/data';

import { PickerCellMessage } from '../picker-cells/picker-cell-messages';
import { EntityNameCell } from './cells/entity-name-cell.component';
import type { CommonFacts } from './common-facts';
import { RulesPropertyKindId } from './rules-property-kinds';

/** The ids of the properties every entry has, which a kind's list builds on. */
export const CommonPropertyId = { Name: 'name', Level: 'level', Traits: 'traits', Source: 'source' } as const;

/** The headers of the common properties, spelled out in full so the key check sees them. */
export const CommonPropertyMessage = {
  Name: 'rules.column.name',
  Traits: 'rules.column.traits',
  Source: 'rules.column.source',
} as const;

/** The name, linking to the entry's page when it has one and previewing the entry. */
export const NAME_PROPERTY: PropertyDescriptor<CommonFacts> = {
  id: CommonPropertyId.Name,
  label: CommonPropertyMessage.Name,
  kind: PropertyKindId.Text,
  value: (entry) => entry.name,
  cell: EntityNameCell,
  code: 'name',
  width: 'md',
};

export const LEVEL_PROPERTY: PropertyDescriptor<CommonFacts> = {
  id: CommonPropertyId.Level,
  label: PickerCellMessage.LevelColumn,
  kind: RulesPropertyKindId.Level,
  value: (entry) => entry.level,
  code: 'lvl',
  width: 'sm',
};

export const TRAITS_PROPERTY: PropertyDescriptor<CommonFacts> = {
  id: CommonPropertyId.Traits,
  label: CommonPropertyMessage.Traits,
  kind: RulesPropertyKindId.Chips,
  value: (entry) => entry.traits,
  code: 'trt',
  sortable: false,
  width: 'md',
};

export const SOURCE_PROPERTY: PropertyDescriptor<CommonFacts> = {
  id: CommonPropertyId.Source,
  label: CommonPropertyMessage.Source,
  kind: RulesPropertyKindId.Sources,
  value: (entry) => entry.sources,
  code: 'src',
  sortable: false,
  width: 'md',
};

/**
 * What every entry has: its name, level, traits and sources. A kind's list (`FEAT_PROPERTIES`) starts from these
 * and adds its own, so a header, a width or a sort is written once.
 */
export const COMMON_PROPERTIES: ReadonlyArray<PropertyDescriptor<CommonFacts>> = [
  NAME_PROPERTY,
  LEVEL_PROPERTY,
  TRAITS_PROPERTY,
  SOURCE_PROPERTY,
];
