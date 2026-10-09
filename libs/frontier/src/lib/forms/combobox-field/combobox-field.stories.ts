import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import type { SelectOption } from '../../controls/select/select.component';
import { ComboboxField } from './combobox-field.component';

type ComboboxFieldStory = StoryObj<ComboboxField<string>>;

const SPELLS: readonly SelectOption<string>[] = [
  { value: 'force-barrage', label: 'Force Barrage' },
  { value: 'heal', label: 'Heal' },
  { value: 'runic-weapon', label: 'Runic Weapon' },
  { value: 'sure-strike', label: 'Sure Strike' },
];

const meta: Meta<ComboboxField<string>> = {
  title: 'Forms/Combobox Field',
  component: ComboboxField,
  argTypes: { errors: { control: false }, searched: { action: 'searched' } },
  args: {
    label: 'Spell',
    options: SPELLS,
    loading: false,
    disabled: false,
    hideLabel: false,
  },
  render: (args) => ({
    props: args,
    template: `<fr-combobox-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: ComboboxFieldStory = {};

export const Picked: ComboboxFieldStory = { args: { value: 'heal' } };

export const WithHint: ComboboxFieldStory = {
  args: { hint: 'Type to search your spell list.' },
};

export const WithError: ComboboxFieldStory = {
  args: { error: 'Choose a spell.' },
};
