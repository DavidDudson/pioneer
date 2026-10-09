import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text/text.component';
import { AsyncStatus } from '../async-action';
import { AsyncIndicator } from './async-indicator.component';

type AsyncIndicatorStory = StoryObj<AsyncIndicator>;

/** The pending spinner and success tick every async component shows. Idle and error render nothing. */
const meta: Meta<AsyncIndicator> = {
  title: 'Async/Async Indicator',
  component: AsyncIndicator,
  decorators: [moduleMetadata({ imports: [Stack, Text] })],
  argTypes: {
    status: { control: 'inline-radio', options: Object.values(AsyncStatus) },
  },
  args: { status: AsyncStatus.Pending, showLabel: false },
  render: (args) => ({
    props: args,
    template: `<fr-async-indicator ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Pending: AsyncIndicatorStory = {};

export const Success: AsyncIndicatorStory = { args: { status: AsyncStatus.Success } };

export const SuccessWithLabel: AsyncIndicatorStory = {
  args: { status: AsyncStatus.Success, showLabel: true, successLabel: 'Saved' },
};

export const Idle: AsyncIndicatorStory = { args: { status: AsyncStatus.Idle } };
