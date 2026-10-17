import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { SHIELD_BLOCK_CARD } from '../testing/browser-fixtures';
import { ContentEntryView } from './content-entry-view.component';

type ContentEntryViewStory = StoryObj<ContentEntryView>;

const meta: Meta<ContentEntryView> = {
  title: 'Content/Entry view',
  component: ContentEntryView,
  args: { card: SHIELD_BLOCK_CARD },
};
export default meta;

/** An entry: its card, with the opening of the description. */
export const Entry: ContentEntryViewStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Shield Block')).toBeVisible();
  },
};

/** The whole description, as the entry's own page shows it. */
export const Full: ContentEntryViewStory = {
  args: { full: true },
};

/** A link no entry has. */
export const Missing: ContentEntryViewStory = {
  args: { card: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No such entry')).toBeVisible();
  },
};
