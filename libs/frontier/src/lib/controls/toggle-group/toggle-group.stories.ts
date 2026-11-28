import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import type { SelectOption } from '../select/select.component';
import { ToggleGroup } from './toggle-group.component';

type ToggleGroupStory = StoryObj<ToggleGroup<string>>;

const RARITIES: ReadonlyArray<SelectOption<string>> = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'unique', label: 'Unique' },
];

const TRAITS: ReadonlyArray<SelectOption<string>> = [
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
const meta: Meta<ToggleGroup<string>> = {
  title: 'Controls/Toggle Group',
  component: ToggleGroup,
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
    template: `<fr-toggle-group ${argsToTemplate(args)} />`,
  }),
};

export default meta;

export const Rarity: ToggleGroupStory = {};

export const NothingSelected: ToggleGroupStory = { args: { value: new Set() } };

/** Many chips wrap onto new rows; the row never scrolls sideways. Try it at phone width. */
export const ManyTraits: ToggleGroupStory = {
  args: {
    options: TRAITS,
    value: new Set(['fire', 'mental', 'visual']),
    ariaLabel: 'Traits',
  },
};

export const Disabled: ToggleGroupStory = { args: { disabled: true } };

/** Announced as invalid on the group (`aria-invalid`); the chips draw no error state of their own. */
export const Invalid: ToggleGroupStory = { args: { invalid: true } };
