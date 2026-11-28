import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TextField } from '../text-field/text-field.component';
import { FieldSet } from './field-set.component';

type FieldSetStory = StoryObj<FieldSet>;

/** Related fields under one legend. The only place a `fieldset` is rendered. */
const meta: Meta<FieldSet> = {
  title: 'Forms/Field Set',
  component: FieldSet,
  decorators: [moduleMetadata({ imports: [TextField] })],
  args: { legend: 'Identity', legendHidden: false },
  render: (args) => ({
    props: args,
    template: `
      <fr-field-set ${argsToTemplate(args)}>
        <fr-text-field label="Name" />
        <fr-text-field label="Pronouns" />
      </fr-field-set>
    `,
  }),
};

export default meta;

export const Default: FieldSetStory = {};

export const HiddenLegend: FieldSetStory = { args: { legendHidden: true } };
