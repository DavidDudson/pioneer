import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { failSlowly, succeedSlowly } from '../../testing/story-actions';
import { Size } from '../../tokens';
import { ButtonType, ButtonVariant } from '../button/button.component';
import { AsyncButton } from './async-button.component';

interface AsyncButtonStoryArgs extends AsyncButton {
  readonly label: string;
}

type AsyncButtonStory = StoryObj<AsyncButtonStoryArgs>;

/** Press it: spinner while pending, a tick on success, then back to rest. Failures show inline. */
const meta: Meta<AsyncButtonStoryArgs> = {
  title: 'Actions/Async Button',
  component: AsyncButton,
  argTypes: {
    action: { control: false },
    describeError: { control: false },
    variant: { control: 'select', options: Object.values(ButtonVariant) },
    size: { control: 'inline-radio', options: Object.values(Size) },
    type: { control: 'inline-radio', options: Object.values(ButtonType) },
    succeeded: { action: 'succeeded' },
  },
  args: {
    label: 'Archive',
    action: succeedSlowly,
    variant: ButtonVariant.Secondary,
    size: Size.Md,
    disabled: false,
  },
  render: ({ label, ...args }) => ({
    props: args,
    template: `<fr-async-button ${argsToTemplate(args)}>${label}</fr-async-button>`,
  }),
};
export default meta;

export const Succeeds: AsyncButtonStory = {};

export const CustomLabels: AsyncButtonStory = {
  args: {
    variant: ButtonVariant.Primary,
    label: 'Level up',
    pendingLabel: 'Levelling up',
    successLabel: 'Levelled up',
  },
};

export const Fails: AsyncButtonStory = {
  args: {
    label: 'Delete',
    variant: ButtonVariant.Danger,
    action: failSlowly,
    describeError: (): string => 'Could not delete. Try again.',
  },
};

export const Disabled: AsyncButtonStory = { args: { disabled: true } };
