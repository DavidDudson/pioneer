import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { moduleMetadata } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import { StepBody } from './step-body.directive';
import { Step } from './step.component';
import { Stepper } from './stepper.component';

type StepperStory = StoryObj<Stepper>;

const meta: Meta<Stepper> = {
  title: 'Actions/Stepper',
  component: Stepper,
  decorators: [moduleMetadata({ imports: [Step, StepBody] })],
  parameters: { layout: 'padded' },
};
export default meta;

const template = `
  <fr-stepper>
    <fr-step label="Archetype" summary="Melee">
      <ng-template frStepBody>Pick an archetype.</ng-template>
    </fr-step>
    <fr-step label="Class" summary="Fighter">
      <ng-template frStepBody>Pick a class.</ng-template>
    </fr-step>
    <fr-step label="Details" summary="Briar">
      <ng-template frStepBody>Name your character.</ng-template>
    </fr-step>
  </fr-stepper>`;

/** Only the first step shows its controls; the later steps are not rendered. */
export const Default: StepperStory = {
  render: () => ({ template }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Pick an archetype.')).toBeInTheDocument();
    await expect(canvas.queryByText('Class')).toBeNull();
  },
};

/** Moving on collapses the step to its summary, with an Edit control. */
export const SecondStep: StepperStory = {
  render: () => ({ template }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await expect(canvas.getByText('Melee')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Edit Archetype' })).toBeInTheDocument();
  },
};
