import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Surface } from '../../layout/surface/surface.component';
import { Skeleton, SkeletonShape, SkeletonWidth } from './skeleton.component';

type SkeletonStory = StoryObj<Skeleton>;

const meta: Meta<Skeleton> = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  decorators: [moduleMetadata({ imports: [Stack, Surface] })],
  argTypes: {
    shape: { control: 'inline-radio', options: Object.values(SkeletonShape) },
    width: { control: 'inline-radio', options: Object.values(SkeletonWidth) },
  },
  args: { shape: SkeletonShape.Text, width: SkeletonWidth.Md },
  render: (args) => ({
    props: args,
    template: `<fr-skeleton ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Text: SkeletonStory = {};

export const Block: SkeletonStory = { args: { shape: SkeletonShape.Block, width: SkeletonWidth.Full } };

export const Square: SkeletonStory = { args: { shape: SkeletonShape.Square } };

export const Widths: SkeletonStory = {
  render: () => ({
    props: { widths: Object.values(SkeletonWidth) },
    template: `
      <fr-stack gap="sm">
        @for (width of widths; track width) {
          <fr-skeleton [width]="width" />
        }
      </fr-stack>
    `,
  }),
};

/** Shaped like the content it replaces: here, a character card. */
export const Card: SkeletonStory = {
  render: () => ({
    template: `
      <fr-surface>
        <fr-stack direction="horizontal" align="center" gap="md">
          <fr-skeleton shape="square" />
          <fr-stack grow gap="2xs">
            <fr-skeleton width="md" />
            <fr-skeleton width="lg" />
          </fr-stack>
        </fr-stack>
      </fr-surface>
    `,
  }),
};
