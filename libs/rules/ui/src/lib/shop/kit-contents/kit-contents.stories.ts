import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { KitContents } from './kit-contents.component';

type KitContentsStory = StoryObj<KitContents>;

const meta: Meta<KitContents> = {
  title: 'Rules/Kit Contents',
  component: KitContents,
};
export default meta;

/** The Adventurer's Pack: a backpack holding the rest. */
export const AdventurersPack: KitContentsStory = {
  args: {
    lines: [
      {
        name: 'Backpack',
        quantity: 1,
        contents: [
          { name: 'Bedroll', quantity: 1, contents: [] },
          { name: 'Chalk', quantity: 10, contents: [] },
          { name: 'Flint and Steel', quantity: 1, contents: [] },
          { name: 'Rope', quantity: 1, contents: [] },
          { name: 'Rations', quantity: 14, contents: [] },
          { name: 'Soap', quantity: 1, contents: [] },
          { name: 'Torch', quantity: 5, contents: [] },
          { name: 'Waterskin', quantity: 1, contents: [] },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('10 × Chalk')).toBeVisible();
    await expect(canvas.getByText('Backpack')).toBeVisible();
  },
};

/** Loose items, none a container. */
export const Loose: KitContentsStory = {
  args: {
    lines: [
      { name: 'Longsword', quantity: 1, contents: [] },
      { name: 'Arrows', quantity: 20, contents: [] },
    ],
  },
};
