import { PropertyKindId } from '@pioneer/frontier/data';
import type { PropertyDescriptor } from '@pioneer/frontier/data';

import { FeatPickerMessage } from '../feat-picker/feat-picker-messages';
import { FeatCategoryCell } from './cells/feat-category-cell.component';
import { FeatTraitsCell } from './cells/feat-traits-cell.component';
import { LEVEL_PROPERTY, NAME_PROPERTY, SOURCE_PROPERTY, TRAITS_PROPERTY } from './common-properties';
import type { FeatFacts } from './feat-facts';
import { RulesPropertyKindId } from './rules-property-kinds';

/** The ids of a feat's properties, which a table is asked to show by. */
export const FeatPropertyId = {
  Name: NAME_PROPERTY.id,
  Level: LEVEL_PROPERTY.id,
  Category: 'category',
  Actions: 'actions',
  Traits: TRAITS_PROPERTY.id,
  Prerequisites: 'prerequisites',
  Source: SOURCE_PROPERTY.id,
  Notes: 'notes',
} as const;

const CATEGORY_PROPERTY: PropertyDescriptor<FeatFacts> = {
  id: FeatPropertyId.Category,
  label: FeatPickerMessage.Category,
  kind: PropertyKindId.Text,
  value: (feat) => feat.category,
  cell: FeatCategoryCell,
  sortable: false,
  width: 'sm',
};

const ACTIONS_PROPERTY: PropertyDescriptor<FeatFacts> = {
  id: FeatPropertyId.Actions,
  label: FeatPickerMessage.Actions,
  kind: RulesPropertyKindId.ActionCost,
  value: (feat) => feat.action,
  sortable: false,
  width: 'sm',
};

/** Traits with a rarity above common first, which the common traits do not show. */
const FEAT_TRAITS_PROPERTY: PropertyDescriptor<FeatFacts> = {
  ...TRAITS_PROPERTY,
  cell: FeatTraitsCell,
};

const PREREQUISITES_PROPERTY: PropertyDescriptor<FeatFacts> = {
  id: FeatPropertyId.Prerequisites,
  label: FeatPickerMessage.Prerequisites,
  kind: RulesPropertyKindId.Prerequisites,
  value: (feat) => feat.prerequisites,
  sortable: false,
  width: 'lg',
};

const NOTES_PROPERTY: PropertyDescriptor<FeatFacts> = {
  id: FeatPropertyId.Notes,
  label: FeatPickerMessage.Notes,
  kind: PropertyKindId.Text,
  value: (feat) => feat.note ?? '',
  sortable: false,
  width: 'md',
};

/**
 * What a feat has, in the order a table lists it: the common properties and the ones a feat adds. A table picks the
 * ids it shows (`FEAT_PICKER_COLUMNS`, the browser's feat view), so a new property is one entry here.
 */
export const FEAT_PROPERTIES: ReadonlyArray<PropertyDescriptor<FeatFacts>> = [
  NAME_PROPERTY,
  LEVEL_PROPERTY,
  CATEGORY_PROPERTY,
  ACTIONS_PROPERTY,
  FEAT_TRAITS_PROPERTY,
  PREREQUISITES_PROPERTY,
  SOURCE_PROPERTY,
  NOTES_PROPERTY,
];

/** The eight columns the feat picker shows, in order. */
export const FEAT_PICKER_COLUMNS: ReadonlyArray<string> = [
  FeatPropertyId.Name,
  FeatPropertyId.Level,
  FeatPropertyId.Category,
  FeatPropertyId.Actions,
  FeatPropertyId.Traits,
  FeatPropertyId.Prerequisites,
  FeatPropertyId.Source,
  FeatPropertyId.Notes,
];
