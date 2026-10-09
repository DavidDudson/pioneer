import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Select } from './select.component';
import type { SelectOption } from './select.component';

type Ancestry = 'dwarf' | 'elf' | 'gnome' | 'goblin' | 'halfling' | 'human';

type SelectStory = StoryObj<Select<Ancestry>>;

const ANCESTRIES: readonly SelectOption<Ancestry>[] = [
  { value: 'dwarf', label: 'Dwarf' },
  { value: 'elf', label: 'Elf' },
  { value: 'gnome', label: 'Gnome' },
  { value: 'goblin', label: 'Goblin' },
  { value: 'halfling', label: 'Halfling' },
  { value: 'human', label: 'Human' },
];

/** A listbox on `@angular/aria`. A pick commits; Escape cancels. */
const meta: Meta<Select<Ancestry>> = {
  title: 'Controls/Select',
  component: Select,
  argTypes: {
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: { options: ANCESTRIES, ariaLabel: 'Ancestry', disabled: false, invalid: false },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    template: `<fr-select ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: SelectStory = {};

export const Selected: SelectStory = { args: { value: 'elf' } };

export const CustomPlaceholder: SelectStory = { args: { placeholder: 'Choose an ancestry' } };

export const Disabled: SelectStory = { args: { value: 'human', disabled: true } };
