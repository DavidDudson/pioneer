import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { FIGHTER_INVENTORY, RUNED_INVENTORY } from '../testing/inventory-fixtures';
import { InventoryView } from './inventory.component';

type InventoryStory = StoryObj<InventoryView>;

const meta: Meta<InventoryView> = {
  title: 'Rules/Inventory',
  component: InventoryView,
};
export default meta;

/** While the character loads. */
export const Loading: InventoryStory = {
  args: { groups: undefined },
};

/** A character carrying nothing. */
export const Empty: InventoryStory = {
  args: { groups: [] },
};

/** Worn, held, stowed and dropped, a container holding a container, a renamed item, an invested one and one whose content is gone. */
export const Fighter: InventoryStory = {
  args: { groups: FIGHTER_INVENTORY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Worn' })).toBeVisible();
    await expect(canvas.getByText('Climbing rope')).toBeVisible();
    await expect(canvas.getByText('An item no loaded content has')).toBeVisible();
  },
};

/** A weapon, armour and a shield with their runes as badges, and a hole for each free slot. */
export const Runed: InventoryStory = {
  args: { groups: RUNED_INVENTORY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Breastplate/u)).toBeVisible();
    await expect(await canvas.findByText(/Steel Shield/u)).toBeVisible();
  },
};
