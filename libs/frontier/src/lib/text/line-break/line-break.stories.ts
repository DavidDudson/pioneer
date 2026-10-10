import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Text } from '../text/text.component';
import { LineBreak } from './line-break.component';

type LineBreakStory = StoryObj<LineBreak>;

/** A line break that is part of the content, such as one line per attribute. */
const meta: Meta<LineBreak> = {
  title: 'Text/Line break',
  component: LineBreak,
  decorators: [moduleMetadata({ imports: [Text] })],
  render: () => ({
    template: '<fr-text element="p">Strength +4<fr-line-break />Dexterity +2<fr-line-break />Constitution +1</fr-text>',
  }),
};
export default meta;

export const InText: LineBreakStory = {};
