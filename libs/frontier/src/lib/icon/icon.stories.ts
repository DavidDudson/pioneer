import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { LucideDices, LucideHeart, LucideLoaderCircle, LucideShield, LucideSword, LucideSwords } from '@lucide/angular';

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
  args: { icon: LucideSword, size: Size.Md, spin: false },
  render: (args) => ({
    props: args,
    // A Lucide icon is a class, and argsToTemplate drops function args.
    template: `<fr-icon [icon]="icon" ${argsToTemplate(args, { exclude: ['icon'] })} />`,
  }),
};
export default meta;

export const Default: IconStory = {};

/** With a `label` the icon is announced; without one it is decorative. */
export const Labelled: IconStory = { args: { icon: LucideHeart, tone: Tone.Danger, label: 'Hit points' } };

export const Spinning: IconStory = { args: { icon: LucideLoaderCircle, spin: true } };

export const Sizes: IconStory = {
  render: () => ({
    props: { sizes: Object.values(Size), icon: LucideShield },
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
    props: { tones: Object.values(Tone), icon: LucideDices },
    template: `
      <fr-stack direction="horizontal" align="center" gap="md">
        @for (tone of tones; track tone) {
          <fr-icon size="lg" [icon]="icon" [tone]="tone" [label]="tone" />
        }
      </fr-stack>
    `,
  }),
};

/** Lines stay 2px at every size. */
export const Stroke: IconStory = {
  render: () => ({
    props: { sizes: Object.values(Size), icon: LucideSwords },
    template: `
      <fr-stack direction="horizontal" align="end" gap="md">
        @for (size of sizes; track size) {
          <fr-icon tone="accent" [icon]="icon" [size]="size" />
        }
      </fr-stack>
    `,
  }),
};
