import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Glyph } from './glyph.component';

type GlyphStory = StoryObj<Glyph>;

/** A rules symbol, such as an action glyph, read out as its label. */
const meta: Meta<Glyph> = {
  title: 'Text/Glyph',
  component: Glyph,
  args: { label: 'Two actions' },
  render: (args) => ({ props: args, template: `<fr-glyph ${argsToTemplate(args)}>◆◆</fr-glyph>` }),
};
export default meta;

export const ActionGlyph: GlyphStory = {};
