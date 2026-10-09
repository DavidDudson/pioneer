import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Container, Space } from '../../tokens';
import { Surface } from '../surface/surface.component';
import { Stack, StackAlign, StackDirection, StackJustify } from './stack.component';

type StackStory = StoryObj<Stack>;

const ITEMS = ['Fighter', 'Rogue', 'Wizard'] as const;

const meta: Meta<Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  decorators: [moduleMetadata({ imports: [Surface, Text] })],
  argTypes: {
    direction: { control: 'inline-radio', options: Object.values(StackDirection) },
    gap: { control: 'select', options: Object.values(Space) },
    align: { control: 'select', options: Object.values(StackAlign) },
    justify: { control: 'select', options: Object.values(StackJustify) },
    horizontalFrom: { control: 'inline-radio', options: [undefined, ...Object.values(Container)] },
  },
  args: {
    direction: StackDirection.Vertical,
    gap: Space.Md,
    align: StackAlign.Stretch,
    justify: StackJustify.Start,
    wrap: false,
    grow: false,
  },
  render: (args) => ({
    props: { ...args, items: ITEMS },
    template: `
      <fr-stack ${argsToTemplate(args)}>
        @for (item of items; track item) {
          <fr-surface padding="sm"><fr-text>{{ item }}</fr-text></fr-surface>
        }
      </fr-stack>
    `,
  }),
};
export default meta;

export const Vertical: StackStory = {};

export const Horizontal: StackStory = { args: { direction: StackDirection.Horizontal, align: StackAlign.Center } };

export const SpaceBetween: StackStory = {
  args: { direction: StackDirection.Horizontal, justify: StackJustify.Between },
};

/** A column when narrow, a row once the stack itself is `md` wide. Resize the canvas to see it switch. */
export const HorizontalFromMedium: StackStory = { args: { horizontalFrom: Container.Md } };
