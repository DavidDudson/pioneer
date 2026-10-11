import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { DWARF_BUILD, FIGHTER_BUILD } from '../testing/build-summary-fixtures';
import { BuildSummaryView } from './build-summary.component';

type BuildSummaryStory = StoryObj<BuildSummaryView>;

const meta: Meta<BuildSummaryView> = {
  title: 'Rules/Build summary',
  component: BuildSummaryView,
};
export default meta;

/** While the character loads. */
export const Loading: BuildSummaryStory = {
  args: { lines: undefined },
};

/** Ancestry, heritage and background picked; each empty part says what to pick. */
export const PartlyBuilt: BuildSummaryStory = {
  args: { lines: DWARF_BUILD },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Rock Dwarf')).toBeVisible();
    await expect(canvas.getByText('Pick a class')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit build' })).toBeVisible();
  },
};

/** Every part picked. */
export const Complete: BuildSummaryStory = {
  args: { lines: FIGHTER_BUILD },
};
