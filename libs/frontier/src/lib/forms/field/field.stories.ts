import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { NumberInput } from '../../controls/number-input/number-input.component';
import { TextInput } from '../../controls/text-input/text-input.component';
import { FieldError } from './error/error.component';
import { Field } from './field.component';
import { FieldHint } from './hint/hint.component';
import { Label } from './label/label.component';

type FieldStory = StoryObj<Field>;

/**
 * The parts a form field is built from. Compose them yourself for a custom
 * arrangement: the control inside `fr-field` picks up its id, description
 * and invalid state through DI.
 */
const meta: Meta<Field> = {
  title: 'Forms/Field Parts',
  component: Field,
  subcomponents: { Label, FieldHint, FieldError },
  decorators: [moduleMetadata({ imports: [FieldError, FieldHint, Label, NumberInput, TextInput] })],
  args: { invalid: false },
  render: (args) => ({
    props: args,
    template: `
      <fr-field ${argsToTemplate(args)}>
        <fr-label>Deity</fr-label>
        <fr-text-input placeholder="Sarenrae" />
        <fr-field-hint>Clerics and champions must choose one.</fr-field-hint>
      </fr-field>
    `,
  }),
};
export default meta;

export const WithHint: FieldStory = {};

export const WithError: FieldStory = {
  args: { invalid: true },
  render: (args) => ({
    props: args,
    template: `
      <fr-field ${argsToTemplate(args)}>
        <fr-label>Hit points</fr-label>
        <fr-number-input [value]="-3" />
        <fr-field-error>Hit points can't be negative.</fr-field-error>
      </fr-field>
    `,
  }),
};

export const VisuallyHiddenLabel: FieldStory = {
  render: (args) => ({
    props: args,
    template: `
      <fr-field ${argsToTemplate(args)}>
        <fr-label visuallyHidden>Search characters</fr-label>
        <fr-text-input placeholder="Search characters" />
      </fr-field>
    `,
  }),
};
