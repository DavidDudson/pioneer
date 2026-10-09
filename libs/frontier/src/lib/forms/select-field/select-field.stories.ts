import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import type { SelectOption } from '../../controls/select/select.component';
import { SelectField } from './select-field.component';

type CharacterClass = 'cleric' | 'fighter' | 'rogue' | 'wizard';

type SelectFieldStory = StoryObj<SelectField<CharacterClass>>;

const CLASSES: readonly SelectOption<CharacterClass>[] = [
  { value: 'cleric', label: 'Cleric' },
  { value: 'fighter', label: 'Fighter' },
  { value: 'rogue', label: 'Rogue' },
  { value: 'wizard', label: 'Wizard' },
];

const meta: Meta<SelectField<CharacterClass>> = {
  title: 'Forms/Select Field',
  component: SelectField,
  argTypes: { errors: { control: false } },
  args: { label: 'Class', options: CLASSES, disabled: false, hideLabel: false },
  render: (args) => ({
    props: args,
    template: `<fr-select-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: SelectFieldStory = {};

export const Selected: SelectFieldStory = { args: { value: 'fighter' } };

export const WithHint: SelectFieldStory = { args: { hint: 'You can change class until level 1 is finished.' } };

export const WithError: SelectFieldStory = { args: { error: 'Choose a class.' } };
