import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { ENCUMBERED_LOAD, LIGHT_LOAD, OVER_MAXIMUM_LOAD } from '../../testing/bulk-fixtures';
import { BulkView } from './bulk.component';

type BulkStory = StoryObj<BulkView>;

const meta: Meta<BulkView> = {
  title: 'Rules/Bulk',
  component: BulkView,
};
export default meta;

/** While the inventory loads. */
export const Loading: BulkStory = {
  args: { bulk: undefined },
};

/** Under the limits, with light items left over. */
export const Unencumbered: BulkStory = {
  args: { bulk: LIGHT_LOAD },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Carrying 6 Bulk and 3 light items')).toBeVisible();
    await expect(canvas.getByText('Encumbered over 7 Bulk; can carry no more than 12 Bulk.')).toBeVisible();
  },
};

/** Past 5 plus Strength. */
export const Encumbered: BulkStory = {
  args: { bulk: ENCUMBERED_LOAD },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Encumbered')).toBeVisible();
  },
};

/** Past 10 plus Strength: the meter is full and the badge says so. */
export const OverMaximum: BulkStory = {
  args: { bulk: OVER_MAXIMUM_LOAD },
};
