import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Space } from '../../tokens';
import { Surface } from '../surface/surface.component';
import { Box, BoxWidth } from './box.component';

type BoxStory = StoryObj<Box>;

const meta: Meta<Box> = {
  title: 'Layout/Box',
  component: Box,
  decorators: [moduleMetadata({ imports: [Surface, Text] })],
  argTypes: {
    width: { control: 'inline-radio', options: Object.values(BoxWidth) },
    padding: { control: 'select', options: Object.values(Space) },
  },
  args: { width: BoxWidth.Full, padding: Space.None, gutter: false },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `
      <fr-box ${argsToTemplate(args)}>
        <fr-surface variant="sunken">
          <fr-text element="p">
            A region. Everything inside responds to the box's width, not the viewport's.
          </fr-text>
        </fr-surface>
      </fr-box>
    `,
  }),
};
export default meta;

export const Full: BoxStory = {};

export const Prose: BoxStory = { args: { width: BoxWidth.Prose } };

export const Page: BoxStory = { args: { width: BoxWidth.Page, padding: Space.Lg } };

export const Gutter: BoxStory = { args: { width: BoxWidth.Page, gutter: true } };
