import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { CLERIC_FEATURES } from '../testing/class-features-fixtures';
import { ClassFeaturesView } from './class-features.component';

type ClassFeaturesStory = StoryObj<ClassFeaturesView>;

const meta: Meta<ClassFeaturesView> = {
  title: 'Rules/Class features',
  component: ClassFeaturesView,
};
export default meta;

/** While the character's grants load. */
export const Loading: ClassFeaturesStory = {
  args: { lines: undefined },
};

/** No class picked yet. */
export const Empty: ClassFeaturesStory = {
  args: { lines: [] },
};

/** A cleric's 1st-level features, its doctrine among them. */
export const Cleric: ClassFeaturesStory = {
  args: { lines: CLERIC_FEATURES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Cloistered Cleric')).toBeVisible();
    await expect(canvas.getAllByText('from Cleric, level 1')).toHaveLength(CLERIC_FEATURES.length);
  },
};
