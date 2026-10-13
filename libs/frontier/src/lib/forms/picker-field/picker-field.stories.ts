import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { tableSchema } from '../../data/table/table-schema';
import { PickerField } from './picker-field.component';

interface Spell {
  readonly id: string;
  readonly name: string;
  readonly rank: number;
}

type PickerFieldStory = StoryObj<PickerField<string, Spell>>;

const SPELLS: readonly Spell[] = [
  { id: 'force-barrage', name: 'Force Barrage', rank: 1 },
  { id: 'heal', name: 'Heal', rank: 1 },
  { id: 'runic-weapon', name: 'Runic Weapon', rank: 1 },
  { id: 'sure-strike', name: 'Sure Strike', rank: 1 },
];

const COLUMNS = tableSchema<Spell>()
  .addText({ id: 'name', header: 'Spell', value: (spell) => spell.name })
  .addText({ id: 'rank', header: 'Rank', value: (spell) => spell.rank, width: 'sm' })
  .build();

const meta: Meta<PickerField<string, Spell>> = {
  title: 'Forms/Picker Field',
  component: PickerField,
  argTypes: {
    errors: { control: false },
    rows: { control: false },
    columns: { control: false },
    rowValue: { control: false },
    rowLabel: { control: false },
    rowDisabled: { control: false },
    searched: { action: 'searched' },
    sorted: { action: 'sorted' },
    loadMore: { action: 'loadMore' },
  },
  args: {
    label: 'Spell',
    rows: SPELLS,
    columns: COLUMNS,
    rowValue: (spell: Spell): string => spell.id,
    rowLabel: (spell: Spell): string => spell.name,
    loading: false,
    loadingMore: false,
    hasMore: false,
    disabled: false,
    hideLabel: false,
  },
  render: (args) => ({
    props: args,
    template: `<fr-picker-field ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: PickerFieldStory = {};

export const Picked: PickerFieldStory = { args: { value: 'heal' } };

export const WithHint: PickerFieldStory = {
  args: { hint: 'Search your spell list.' },
};

export const WithError: PickerFieldStory = {
  args: { error: 'Choose a spell.' },
};
