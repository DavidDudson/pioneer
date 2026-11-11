import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Dices, Heart, LoaderCircle, Shield, Sword, Swords } from 'lucide';

import { Stack } from '../layout/stack/stack.component';
import { Size, Tone } from '../tokens';
import { Icon } from './icon.component';

type IconStory = StoryObj<Icon>;

const meta: Meta<Icon> = {
  title: 'Icons/Icon',
  component: Icon,
  decorators: [moduleMetadata({ imports: [Stack] })],
  argTypes: {
    icon: { control: false },
    size: { control: 'inline-radio', options: Object.values(Size) },
    tone: { control: 'select', options: [undefined, ...Object.values(Tone)] },
  },
  args: { icon: Sword, size: Size.Md, spin: false },
  render: (args) => ({
    props: args,
    // An icon is an array of shapes, which argsToTemplate would serialise, so it is bound by hand.
    template: `<fr-icon [icon]="icon" ${argsToTemplate(args, { exclude: ['icon'] })} />`,
  }),
};
export default meta;

export const Default: IconStory = {};

/** With a `label` the icon is announced; without one it is decorative. */
export const Labelled: IconStory = {
  args: { icon: Heart, tone: Tone.Danger, label: 'Hit points' },
};

export const Spinning: IconStory = { args: { icon: LoaderCircle, spin: true } };

export const Sizes: IconStory = {
  render: () => ({
    props: { sizes: Object.values(Size), icon: Shield },
    template: `
      <fr-stack direction="horizontal" align="center" gap="md">
        @for (size of sizes; track size) {
          <fr-icon [icon]="icon" [size]="size" />
        }
      </fr-stack>
    `,
  }),
};

export const Tones: IconStory = {
  render: () => ({
    props: { tones: Object.values(Tone), icon: Dices },
    template: `
      <fr-stack direction="horizontal" align="center" gap="md">
        @for (tone of tones; track tone) {
          <fr-icon size="lg" [icon]="icon" [tone]="tone" [label]="tone" />
        }
      </fr-stack>
    `,
  }),
};

/** Lines stay 1px at every size. */
export const Stroke: IconStory = {
  render: () => ({
    props: { sizes: Object.values(Size), icon: Swords },
    template: `
      <fr-stack direction="horizontal" align="end" gap="md">
        @for (size of sizes; track size) {
          <fr-icon tone="accent" [icon]="icon" [size]="size" />
        }
      </fr-stack>
    `,
  }),
};
