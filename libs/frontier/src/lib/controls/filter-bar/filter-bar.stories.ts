import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { FilterBar } from './filter-bar.component';
import { FilterKind, FilterOperator } from './filter-bar.types';
import type { FilterCondition, FilterField } from './filter-bar.types';

type FilterBarStory = StoryObj<FilterBar>;

const FIELDS: readonly FilterField[] = [
  {
    id: 'rarity',
    label: 'Rarity',
    kind: FilterKind.Set,
    options: [
      { value: 'common', label: 'Common', count: 812 },
      { value: 'uncommon', label: 'Uncommon', count: 240 },
      { value: 'rare', label: 'Rare', count: 61 },
      { value: 'unique', label: 'Unique', count: 9 },
    ],
  },
  {
    id: 'traits',
    label: 'Trait',
    kind: FilterKind.Set,
    options: ['Fire', 'Cold', 'Divine', 'Arcane', 'Healing', 'Mental'].map((label) => ({
      value: label.toLowerCase(),
      label,
    })),
  },
  { id: 'level', label: 'Level', kind: FilterKind.Range },
  {
    id: 'consumable',
    label: 'Consumable',
    kind: FilterKind.Flag,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
];

const APPLIED: readonly FilterCondition[] = [
  { field: 'rarity', operator: FilterOperator.IsAnyOf, values: ['uncommon', 'rare'] },
  { field: 'level', operator: FilterOperator.Between, values: ['3', '5'] },
  { field: 'traits', operator: FilterOperator.IsNot, values: ['fire'] },
];

/**
 * Narrows a list with editable filter chips. *Add filter* opens a panel in place: field, then operator, then values.
 * Press a chip to change it, its cross to remove it. Wraps, never scrolls sideways.
 */
const meta: Meta<FilterBar> = {
  title: 'Controls/Filter Bar',
  component: FilterBar,
  argTypes: { fields: { control: false }, value: { control: false } },
  args: { fields: FIELDS, value: [] },
  render: (args) => ({
    props: args,
    template: `<fr-filter-bar ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: FilterBarStory = {};

/** Set, range and flag filters; a range with an open end reads "from 3" or "up to 5". */
export const WithFilters: FilterBarStory = { args: { value: APPLIED } };
