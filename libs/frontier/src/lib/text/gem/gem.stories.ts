import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Gem, GemTone } from './gem.component';

type GemStory = StoryObj<Gem>;

/** A cut stone with glyphs on it; a filled one pulses in its tone, a hole is the same outline, empty. */
const meta: Meta<Gem> = {
  title: 'Text/Gem',
  component: Gem,
  argTypes: { tone: { control: 'inline-radio', options: Object.values(GemTone) } },
  args: { tone: GemTone.Blue, glyphs: 'ᚠᚢ', label: 'Flaming' },
  render: (args) => ({ props: args, template: `<fr-gem ${argsToTemplate(args)} />` }),
};
export default meta;

export const Blue: GemStory = {};
export const Purple: GemStory = { args: { tone: GemTone.Purple, label: 'Greater striking', glyphs: 'ᚦ' } };
export const Red: GemStory = { args: { tone: GemTone.Red, label: 'Major striking', glyphs: 'ᚦ' } };
export const Gold: GemStory = { args: { tone: GemTone.Gold, label: 'Mythic striking', glyphs: 'ᚦ' } };
export const Hole: GemStory = { args: { tone: undefined, glyphs: '+', label: 'Empty rune slot' } };
export const Black: GemStory = { args: { tone: GemTone.Black, label: 'Not applied', glyphs: 'ᚠᚢ' } };
