import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import type { SelectOption } from '../select/select.component';
import { Segmented } from './segmented.component';

type Unit = 'feet' | 'metres';
type Proficiency = 'trained' | 'expert' | 'master';

type SegmentedStory = StoryObj<Segmented<string>>;

const UNITS: readonly SelectOption<Unit>[] = [
  { value: 'feet', label: 'Feet' },
  { value: 'metres', label: 'Metres' },
];

const PROFICIENCIES: readonly SelectOption<Proficiency>[] = [
  { value: 'trained', label: 'Trained' },
  { value: 'expert', label: 'Expert' },
  { value: 'master', label: 'Master' },
];

/** Single-select for two or three options. Prefer `fr-select` for four or more. */
const meta: Meta<Segmented<string>> = {
  title: 'Controls/Segmented',
  component: Segmented,
  argTypes: { committed: { action: 'committed' } },
  args: { options: UNITS, value: 'feet', ariaLabel: 'Distance unit', disabled: false, invalid: false },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    template: `<fr-segmented ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const TwoOptions: SegmentedStory = {};

export const ThreeOptions: SegmentedStory = {
  args: { options: PROFICIENCIES, value: 'expert', ariaLabel: 'Proficiency' },
};

export const NothingChosen: SegmentedStory = { args: { value: undefined } };

export const Disabled: SegmentedStory = { args: { disabled: true } };

export const Invalid: SegmentedStory = { args: { value: undefined, invalid: true } };
