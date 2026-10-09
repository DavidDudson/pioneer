import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import type { SelectOption } from '../select/select.component';
import { FilterChips } from './filter-chips.component';

type FilterChipsStory = StoryObj<FilterChips<string>>;

const RARITIES: readonly SelectOption<string>[] = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'unique', label: 'Unique' },
];

const TRAITS: readonly SelectOption<string>[] = [
  'Acid',
  'Air',
  'Attack',
  'Auditory',
  'Cold',
  'Concentrate',
  'Death',
  'Divine',
  'Earth',
  'Electricity',
  'Emotion',
  'Fear',
  'Fire',
  'Fortune',
  'Healing',
  'Incapacitation',
  'Manipulate',
  'Mental',
  'Move',
  'Poison',
  'Sonic',
  'Visual',
  'Void',
  'Water',
].map((label) => ({ value: label.toLowerCase(), label }));

/** Several independent filters as a wrapping row of toggle buttons, with clear all. */
const meta: Meta<FilterChips<string>> = {
  title: 'Controls/Filter Chips',
  component: FilterChips,
  argTypes: { committed: { action: 'committed' } },
  args: {
    options: RARITIES,
    value: new Set(['uncommon']),
    ariaLabel: 'Rarity',
    disabled: false,
  },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    template: `<fr-filter-chips ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Rarity: FilterChipsStory = {};

export const NothingSelected: FilterChipsStory = { args: { value: new Set() } };

/** Many chips wrap onto new rows; the row never scrolls sideways. Try it at phone width. */
export const ManyTraits: FilterChipsStory = {
  args: {
    options: TRAITS,
    value: new Set(['fire', 'mental', 'visual']),
    ariaLabel: 'Traits',
  },
};

export const Disabled: FilterChipsStory = { args: { disabled: true } };
