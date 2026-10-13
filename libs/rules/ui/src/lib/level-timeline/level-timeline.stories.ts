import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { FIGHTER_TIMELINE } from '../testing/timeline-fixtures';
import { LevelTimeline } from './level-timeline.component';

type LevelTimelineStory = StoryObj<LevelTimeline>;

const meta: Meta<LevelTimeline> = {
  title: 'Rules/Level timeline',
  component: LevelTimeline,
};
export default meta;

/** While the character's slots load. */
export const Loading: LevelTimelineStory = {
  args: { rows: undefined },
};

/** A fighter at 2nd level: a pick, a slot not chosen at the current level, an empty level and a planned pick. */
export const Fighter: LevelTimelineStory = {
  args: { rows: FIGHTER_TIMELINE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Current level')).toBeVisible();
    await expect(canvas.getByText('Nothing opens at this level.')).toBeVisible();
    await expect(canvas.getByText('Planned for level 4')).toBeVisible();
  },
};
