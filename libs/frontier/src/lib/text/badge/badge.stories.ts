import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { LucideFlame, LucideGem, LucideSkull } from '@lucide/angular';

import { Stack } from '../../layout/stack/stack.component';
import { Badge, BadgeTone, BadgeVariant } from './badge.component';

interface BadgeStoryArgs extends Badge {
  readonly content: string;
}

type BadgeStory = StoryObj<BadgeStoryArgs>;

const meta: Meta<BadgeStoryArgs> = {
  title: 'Text/Badge',
  component: Badge,
  decorators: [moduleMetadata({ imports: [Stack] })],
  argTypes: {
    tone: { control: 'inline-radio', options: Object.values(BadgeTone) },
    variant: { control: 'inline-radio', options: Object.values(BadgeVariant) },
    icon: { control: false },
  },
  args: {
    content: 'Fire',
    tone: BadgeTone.Neutral,
    variant: BadgeVariant.Subtle,
  },
  render: ({ content, ...args }) => ({
    props: args,
    // A Lucide icon is a class, and argsToTemplate drops function args.
    template: `<fr-badge [icon]="icon" ${argsToTemplate(args, { exclude: ['icon'] })}>${content}</fr-badge>`,
  }),
};
export default meta;

export const Default: BadgeStory = {};

/** A leading icon takes the badge's text colour and is decorative. */
export const WithIcon: BadgeStory = {
  args: { icon: LucideFlame, tone: BadgeTone.Danger },
};

/** One condition that must stand out. */
export const Solid: BadgeStory = {
  args: {
    content: 'Dying 2',
    icon: LucideSkull,
    tone: BadgeTone.Danger,
    variant: BadgeVariant.Solid,
  },
};

/** Every tone in both variants. Switch theme and mode in the toolbar to check contrast. */
export const Tones: BadgeStory = {
  render: () => ({
    props: {
      tones: Object.values(BadgeTone),
      variants: Object.values(BadgeVariant),
      icon: LucideGem,
    },
    template: `
      <fr-stack gap="sm">
        @for (variant of variants; track variant) {
          <fr-stack direction="horizontal" gap="xs" wrap>
            @for (tone of tones; track tone) {
              <fr-badge [tone]="tone" [variant]="variant" [icon]="icon">{{ tone }}</fr-badge>
            }
          </fr-stack>
        }
      </fr-stack>
    `,
  }),
};

/** A creature's traits: rarity first, then the rest. */
export const Traits: BadgeStory = {
  render: () => ({
    template: `
      <fr-stack direction="horizontal" gap="2xs" wrap>
        <fr-badge tone="accent">Uncommon</fr-badge>
        <fr-badge>Dragon</fr-badge>
        <fr-badge>Fire</fr-badge>
        <fr-badge>Amphibious</fr-badge>
      </fr-stack>
    `,
  }),
};
