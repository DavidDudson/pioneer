import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Clamp, ClampLines } from './clamp.component';

type ClampStory = StoryObj<Clamp>;

const meta: Meta<Clamp> = {
  title: 'Layout/Clamp',
  component: Clamp,
  argTypes: { lines: { control: 'inline-radio', options: Object.values(ClampLines) } },
  args: { lines: ClampLines.Two },
  render: (args) => ({
    props: args,
    template: `<fr-clamp [lines]="lines">The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.</fr-clamp>`,
  }),
};
export default meta;

/** Cut off after two lines. */
export const TwoLines: ClampStory = {};

/** One line, as in a dense row. */
export const OneLine: ClampStory = { args: { lines: ClampLines.One } };
