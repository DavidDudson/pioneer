import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Heading } from '../../text/heading/heading.component';
import { Text } from '../../text/text/text.component';
import { Inset, Space } from '../../tokens';
import { Stack } from '../stack/stack.component';
import { DEFAULT_SURFACE_PADDING, Surface } from './surface.component';

type SurfaceStory = StoryObj<Surface>;

const meta: Meta<Surface> = {
  title: 'Layout/Surface',
  component: Surface,
  decorators: [moduleMetadata({ imports: [Heading, Stack, Text] })],
  argTypes: {
    padding: { control: 'select', options: [...Object.values(Inset), ...Object.values(Space)] },
  },
  args: { padding: DEFAULT_SURFACE_PADDING },
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

export const Default: SurfaceStory = {};

export const Roomy: SurfaceStory = { args: { padding: Space.Lg } };
