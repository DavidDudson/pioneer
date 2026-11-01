import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { GiftBadge } from './gift-badge.component';

type GiftBadgeStory = StoryObj<GiftBadge>;

const meta: Meta<GiftBadge> = {
  title: 'Actions/GiftBadge',
  component: GiftBadge,
  args: { count: 1, label: 'A gift is waiting' },
};
export default meta;

/** One offer: the present rocks, with no count. Under reduced motion it is still. */
export const One: GiftBadgeStory = {};

/** Several offers show their count. */
export const Several: GiftBadgeStory = { args: { count: 3, label: '3 gifts are waiting' } };

/** What the badge opens is showing. */
export const Expanded: GiftBadgeStory = { args: { expanded: true } };
