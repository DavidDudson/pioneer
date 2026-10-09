import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Heading } from '../../text/heading/heading.component';
import { Text } from '../../text/text/text.component';
import { Space } from '../../tokens';
import { Stack } from '../stack/stack.component';
import { Surface, SurfaceVariant } from './surface.component';

type SurfaceStory = StoryObj<Surface>;

const meta: Meta<Surface> = {
  title: 'Layout/Surface',
  component: Surface,
  decorators: [moduleMetadata({ imports: [Heading, Stack, Text] })],
  argTypes: {
    variant: { control: 'inline-radio', options: Object.values(SurfaceVariant) },
    padding: { control: 'select', options: Object.values(Space) },
  },
  args: { variant: SurfaceVariant.Raised, padding: Space.Lg },
  render: (args) => ({
    props: args,
    template: `
      <fr-surface ${argsToTemplate(args)}>
        <fr-stack gap="2xs">
          <fr-heading variant="subheading" [level]="2">Valeros</fr-heading>
          <fr-text tone="muted">Human fighter, level 3</fr-text>
        </fr-stack>
      </fr-surface>
    `,
  }),
};
export default meta;

export const Raised: SurfaceStory = {};

export const Base: SurfaceStory = { args: { variant: SurfaceVariant.Base } };

export const Sunken: SurfaceStory = { args: { variant: SurfaceVariant.Sunken } };

export const Outline: SurfaceStory = { args: { variant: SurfaceVariant.Outline } };
