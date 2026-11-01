import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Stack } from '../stack/stack.component';
import { Responsive } from './responsive.component';

type ResponsiveStory = StoryObj<Responsive>;

const meta: Meta<Responsive> = {
  title: 'Layout/Responsive',
  component: Responsive,
  decorators: [moduleMetadata({ imports: [Stack, Text] })],
  parameters: { layout: 'fullscreen' },
  render: () => ({
    template: `
      <fr-stack horizontalFrom="lg">
        <fr-responsive showFrom="lg"><fr-text>Shown from the lg container size.</fr-text></fr-responsive>
        <fr-responsive hideFrom="lg"><fr-text>Shown below the lg container size.</fr-text></fr-responsive>
      </fr-stack>
    `,
  }),
};
export default meta;

/** One of the two shows, by the width of the stack around them. */
export const Default: ResponsiveStory = {};
