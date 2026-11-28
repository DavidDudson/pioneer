import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../../text/text/text.component';
import { Inset, Space } from '../../tokens';
import { Surface } from '../surface/surface.component';
import { Box, BoxWidth } from './box.component';

type BoxStory = StoryObj<Box>;

const meta: Meta<Box> = {
  title: 'Layout/Box',
  component: Box,
  decorators: [moduleMetadata({ imports: [Surface, Text] })],
  argTypes: {
    width: { control: 'inline-radio', options: Object.values(BoxWidth) },
    paddingBlock: { control: 'select', options: [...Object.values(Inset), ...Object.values(Space)] },
    paddingInline: { control: 'select', options: [...Object.values(Inset), ...Object.values(Space), 'gutter'] },
  },
  args: { width: BoxWidth.Full, paddingBlock: Space.None, paddingInline: Space.None },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `
      <fr-box ${argsToTemplate(args)}>
        <fr-surface>
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

export const Page: BoxStory = { args: { width: BoxWidth.Page, paddingBlock: Space.Lg, paddingInline: 'gutter' } };

export const Gutter: BoxStory = { args: { width: BoxWidth.Page, paddingInline: 'gutter' } };

export const BlockOnly: BoxStory = { args: { width: BoxWidth.Page, paddingBlock: Space.Lg } };

export const ShownFromMd: BoxStory = { args: { shownFrom: 'md' } };

export const HiddenFromMd: BoxStory = { args: { hiddenFrom: 'md' } };
