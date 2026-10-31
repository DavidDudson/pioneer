import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { LegacyBadge } from './legacy-badge.component';

type LegacyBadgeStory = StoryObj<LegacyBadge>;

const meta: Meta<LegacyBadge> = {
  title: 'Content/Legacy badge',
  component: LegacyBadge,
};
export default meta;

/** An entry from a pre-remaster book. */
export const Legacy: LegacyBadgeStory = {
  args: { legacy: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Legacy')).toBeVisible();
  },
};

/** Any other entry: no badge. */
export const Remaster: LegacyBadgeStory = {
  args: { legacy: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('Legacy')).toBeNull();
  },
};
