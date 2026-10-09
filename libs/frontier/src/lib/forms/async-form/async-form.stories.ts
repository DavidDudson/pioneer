import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { FormField } from '@angular/forms/signals';

import { AsyncButton } from '../../actions/async-button/async-button.component';
import { Grid } from '../../layout/grid/grid.component';
import { Stack } from '../../layout/stack/stack.component';
import { failSlowly, succeedSlowly } from '../../testing/story-actions';
import { StoryForm } from '../../testing/story-form.directive';
import type { StoryFormModel } from '../../testing/story-form.directive';
import { TextField } from '../text-field/text-field.component';
import { AsyncForm } from './async-form.component';

type AsyncFormStory = StoryObj<AsyncForm<StoryFormModel>>;

const TEMPLATE = `
  <ng-container *frStoryForm="let form">
    <fr-async-form [form]="form" [action]="action" [describeError]="describeError" (succeeded)="succeeded()">
      <fr-stack gap="md">
        <fr-grid [columns]="2">
          <fr-text-field label="Name" placeholder="Valeros" [formField]="form.name" />
          <fr-text-field label="Player" hint="Optional" [formField]="form.player" />
        </fr-grid>
        <fr-stack direction="horizontal" justify="end">
          <fr-async-button type="submit" variant="primary" pendingLabel="Creating" successLabel="Created">
            Create
          </fr-async-button>
        </fr-stack>
      </fr-stack>
    </fr-async-form>
  </ng-container>
`;

/**
 * Validates with signal forms first (an invalid form never runs the action),
 * then submits with the async states on its submit button. Mod+Enter submits.
 * Submit with an empty name to see validation.
 */
const meta: Meta<AsyncForm<StoryFormModel>> = {
  title: 'Forms/Async Form',
  component: AsyncForm,
  decorators: [moduleMetadata({ imports: [AsyncButton, FormField, Grid, Stack, StoryForm, TextField] })],
  argTypes: {
    form: { control: false },
    action: { control: false },
    describeError: { control: false },
    succeeded: { action: 'succeeded' },
  },
  args: { action: succeedSlowly },
  render: (args) => ({ props: args, template: TEMPLATE }),
};
export default meta;

export const Succeeds: AsyncFormStory = {};

export const Fails: AsyncFormStory = {
  args: {
    action: failSlowly,
    describeError: (): string => 'Could not create the character. Try again.',
  },
};
