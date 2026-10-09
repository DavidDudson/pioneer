import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Stack } from '../../layout/stack/stack.component';
import { Tone } from '../../tokens';
import { TextVariant } from '../text.variants';
import { Heading, HeadingLevel } from './heading.component';

interface HeadingStoryArgs extends Heading {
  readonly content: string;
}

type HeadingStory = StoryObj<HeadingStoryArgs>;

const meta: Meta<HeadingStoryArgs> = {
  title: 'Text/Heading',
  component: Heading,
  decorators: [moduleMetadata({ imports: [Skeleton, Stack] })],
  argTypes: {
    level: { control: 'inline-radio', options: Object.values(HeadingLevel) },
    variant: { control: 'select', options: [undefined, ...Object.values(TextVariant)] },
    tone: { control: 'select', options: Object.values(Tone) },
  },
  args: { content: 'Abilities', level: HeadingLevel.Two, tone: Tone.Default, truncate: false, busy: false },
  render: ({ content, ...args }) => ({
    props: args,
    template: `<fr-heading ${argsToTemplate(args)}>${content}</fr-heading>`,
  }),
};
export default meta;

export const Default: HeadingStory = {};

/** `level` sets the document outline; each level has a default look. */
export const Levels: HeadingStory = {
  render: () => ({
    props: { levels: Object.values(HeadingLevel) },
    template: `
      <fr-stack gap="sm">
        @for (level of levels; track level) {
          <fr-heading [level]="level">Heading level {{ level }}</fr-heading>
        }
      </fr-stack>
    `,
  }),
};

/** `variant` changes the look without changing the outline. */
export const VariantOverride: HeadingStory = { args: { level: HeadingLevel.Two, variant: TextVariant.Subheading } };

/** While the subject loads, a busy heading holds a skeleton. */
export const Busy: HeadingStory = {
  render: () => ({
    template: `<fr-heading busy [level]="1"><fr-skeleton width="md" /></fr-heading>`,
  }),
};
