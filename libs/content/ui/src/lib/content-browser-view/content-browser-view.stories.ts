import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { ContentBrowserTier } from '../browser-state';
import {
  BROWSER_FIELDS,
  BROWSER_LIST,
  BROWSER_ROWS,
  LISTING_STATE,
  loaded,
  NO_FACETS,
  PICKED_STATE,
  SHIELD_BLOCK_CARD,
} from '../testing/browser-fixtures';
import { ContentBrowserView } from './content-browser-view.component';

type ContentBrowserStory = StoryObj<ContentBrowserView>;

const meta: Meta<ContentBrowserView> = {
  title: 'Content/Content browser',
  component: ContentBrowserView,
  args: {
    state: LISTING_STATE,
    kindOptions: [],
    fields: BROWSER_FIELDS,
    facetState: NO_FACETS,
    list: loaded(BROWSER_LIST),
    entry: loaded({ card: SHIELD_BLOCK_CARD }),
    columns: [],
  },
};
export default meta;

const FIRST_NAME = BROWSER_ROWS[0]?.name ?? '';

/** Full width: the search, the kinds, the filter bar and the facet panel over the table. */
export const Page: ContentBrowserStory = {
  args: { tier: ContentBrowserTier.Page },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('searchbox')).toBeVisible();
  },
};

/** Narrow, for a side drawer: the search and a compact filter bar over a list of names that open in place. */
export const Panel: ContentBrowserStory = {
  args: { tier: ContentBrowserTier.Panel },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: FIRST_NAME })).toBeVisible();
  },
};

/** The panel with an entry picked: the entry, and a way back to the list. */
export const PanelEntry: ContentBrowserStory = {
  args: { tier: ContentBrowserTier.Panel, state: PICKED_STATE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Back to the list' })).toBeVisible();
  },
};

/** Compact, for a hover: the picked entry alone. */
export const Preview: ContentBrowserStory = {
  args: { tier: ContentBrowserTier.Preview, state: PICKED_STATE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Shield Block')).toBeVisible();
  },
};
