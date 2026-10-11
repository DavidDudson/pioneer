import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { PROPHECIES_OF_KALISTRADE, SARENRAE } from '../testing/deity-fixtures';
import { DeityView } from './deity.component';

type DeityStory = StoryObj<DeityView>;

const meta: Meta<DeityView> = {
  title: 'Rules/Deity',
  component: DeityView,
};
export default meta;

/** While the character loads. */
export const Loading: DeityStory = {
  args: { deity: undefined, loading: true },
};

/** No deity picked. */
export const None: DeityStory = {
  args: { deity: undefined },
};

/** Sarenrae: a healing font, can be holy, her domains, favoured weapon, edicts and anathema. */
export const Sarenrae: DeityStory = {
  args: { deity: SARENRAE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Can be holy')).toBeVisible();
    await expect(canvas.getByText('Scimitar')).toBeVisible();
  },
};

/** A philosophy grants no font, sanctification or domains. */
export const Philosophy: DeityStory = {
  args: { deity: PROPHECIES_OF_KALISTRADE },
};
