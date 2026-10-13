import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { KitContents } from './kit-contents.component';
import { kitLine } from './kit-contents.fixtures';

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
      kitLine('Backpack', 1, [
        kitLine('Bedroll', 1),
        kitLine('Chalk', 10),
        kitLine('Flint and Steel', 1),
        kitLine('Rope', 1),
        kitLine('Rations', 14),
        kitLine('Soap', 1),
        kitLine('Torch', 5),
        kitLine('Waterskin', 1),
      ]),
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
    lines: [kitLine('Longsword', 1), kitLine('Arrows', 20)],
  },
};
