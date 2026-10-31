import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text/text.component';
import { Surface } from '../surface/surface.component';
import { Rail } from './rail.component';

type RailStory = StoryObj<Rail>;

const meta: Meta<Rail> = {
  title: 'Layout/Rail',
  component: Rail,
  decorators: [moduleMetadata({ imports: [Stack, Surface, Text] })],
  args: { label: 'Skills' },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `
      <fr-stack horizontalFrom="lg" align="start">
        <fr-rail [label]="label"><fr-surface><fr-text element="p">Rail content.</fr-text></fr-surface></fr-rail>
        <fr-stack grow><fr-surface><fr-text element="p">Content beside the rail.</fr-text></fr-surface></fr-stack>
      </fr-stack>
    `,
  }),
};
export default meta;

/** Beside the content from the `lg` container size, sticky and full height; stacked above it when narrower. */
export const Default: RailStory = {};

/** With `hiddenNarrow`, gone below the `lg` container size, for a page that offers its content another way there. */
export const HiddenNarrow: RailStory = {
  args: { hiddenNarrow: true },
};
