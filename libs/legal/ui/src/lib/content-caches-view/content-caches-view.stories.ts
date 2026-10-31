import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { CORE_RULES_CACHE, failed, loaded, PLAYER_CORE_CACHE, stillLoading } from '../testing/cache-fixtures';
import { ContentCachesView } from './content-caches-view.component';

type ContentCachesStory = StoryObj<ContentCachesView>;

const meta: Meta<ContentCachesView> = {
  title: 'Legal/Content caches',
  component: ContentCachesView,
  args: { caches: loaded([PLAYER_CORE_CACHE, CORE_RULES_CACHE]) },
};
export default meta;

/** Each pack with its file count and total size; an imported pack names its book, a bare one its id. */
export const Packs: ContentCachesStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Player Core: 3 files, 1.5 MB')).toBeVisible();
    await expect(canvas.getByText('Pioneer pack: core-rules: 0 files, 0 kB')).toBeVisible();
  },
};

/** Placeholder rows while the manifest loads. */
export const Loading: ContentCachesStory = {
  args: { caches: stillLoading() },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('fr-skeleton')).toHaveLength(3);
  },
};

/** The manifest could not be loaded. */
export const LoadError: ContentCachesStory = {
  args: { caches: failed() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Could not load the content caches.')).toBeVisible();
  },
};

/** No packs in the manifest: the heading and introduction stand alone. */
export const Empty: ContentCachesStory = {
  args: { caches: loaded([]) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { name: 'Content caches' })).toBeVisible();
  },
};
