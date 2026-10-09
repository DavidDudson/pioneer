import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TextArea } from './text-area.component';

type TextAreaStory = StoryObj<TextArea>;

const PREDICATE = '[\n  "self:condition:frightened",\n  { "or": ["action:seek", "terrain:forest"] }\n]';

/** A plain multi-line control. Enter starts a new line; read `value`. `monospace` suits JSON and formulas. */
const meta: Meta<TextArea> = {
  title: 'Controls/Text Area',
  component: TextArea,
  args: {
    value: '',
    placeholder: 'Notes',
    ariaLabel: 'Notes',
    rows: 6,
    monospace: false,
    disabled: false,
    invalid: false,
  },
  render: (args) => ({
    props: args,
    template: `<fr-text-area ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Empty: TextAreaStory = {};

export const Filled: TextAreaStory = { args: { value: 'Owes the innkeeper 5 gp.\nAvoid the north road.' } };

export const Monospace: TextAreaStory = { args: { value: PREDICATE, ariaLabel: 'JSON', monospace: true } };

export const Invalid: TextAreaStory = { args: { value: PREDICATE, monospace: true, invalid: true } };

export const Disabled: TextAreaStory = { args: { value: 'Owes the innkeeper 5 gp.', disabled: true } };
