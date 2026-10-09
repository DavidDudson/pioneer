import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Button } from '../../actions/button/button.component';
import { Grid } from '../../layout/grid/grid.component';
import { Stack } from '../../layout/stack/stack.component';
import { NumberField } from '../number-field/number-field.component';
import { TextField } from '../text-field/text-field.component';
import { Form } from './form.component';

type FormStory = StoryObj<Form>;

/** A plain form: `(submitted)` fires without a page load. For server submits use `fr-async-form`. */
const meta: Meta<Form> = {
  title: 'Forms/Form',
  component: Form,
  decorators: [moduleMetadata({ imports: [Button, Grid, NumberField, Stack, TextField] })],
  argTypes: { submitted: { action: 'submitted' } },
  render: (args) => ({
    props: args,
    template: `
      <fr-form ${argsToTemplate(args)}>
        <fr-stack gap="md">
          <fr-grid [columns]="2">
            <fr-text-field label="Name" placeholder="Valeros" />
            <fr-number-field label="Level" [value]="1" [min]="1" [max]="20" />
          </fr-grid>
          <fr-stack direction="horizontal" justify="end">
            <fr-button type="submit" variant="primary">Create</fr-button>
          </fr-stack>
        </fr-stack>
      </fr-form>
    `,
  }),
};
export default meta;

export const Default: FormStory = {};
