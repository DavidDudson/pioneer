import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { AUTOMATIC_TIMELINE } from '../../testing/timeline-fixtures';
import { LevelTimelineAutomatic } from './level-timeline-automatic.component';

type LevelTimelineAutomaticStory = StoryObj<LevelTimelineAutomatic>;

const meta: Meta<LevelTimelineAutomatic> = {
  title: 'Rules/Level timeline/Automatic improvements',
  component: LevelTimelineAutomatic,
};
export default meta;

/** A feature, a rank rise and their source: read-only text, nothing to pick. */
export const Improvements: LevelTimelineAutomaticStory = {
  args: { lines: AUTOMATIC_TIMELINE[0]?.automatic ?? [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Shield Block')).toBeVisible();
    await expect(canvas.getAllByText('Class (Fighter)')[0]).toBeVisible();
  },
};
