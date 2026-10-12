import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Coin } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { ShopBillFor } from '../shop-offer';
import { ShopBill } from './shop-bill.component';

type ShopBillStory = StoryObj<ShopBill>;

const meta: Meta<ShopBill> = {
  title: 'Rules/Shop Bill',
  component: ShopBill,
  args: { reasonId: 'shop-bill-reason' },
};
export default meta;

/** The coins cover the cost. */
export const Affordable: ShopBillStory = {
  args: {
    cost: [
      { coin: Coin.Gold, count: 1 },
      { coin: Coin.Silver, count: 5 },
    ],
    coins: [
      { coin: Coin.Gold, count: 15 },
      { coin: Coin.Copper, count: 7 },
    ],
    affordable: true,
  },
};

/** An item with no price, and a character with no coins. */
export const FreeAndBroke: ShopBillStory = {
  args: { cost: [], coins: [], affordable: true },
};

/** The coins don't cover the cost: the reason shows. */
export const Unaffordable: ShopBillStory = {
  args: {
    cost: [{ coin: Coin.Platinum, count: 2 }],
    coins: [{ coin: Coin.Gold, count: 15 }],
    affordable: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Your coins don't cover the cost. Buy fewer, or add it without paying."),
    ).toBeVisible();
  },
};

/** A kit the coins don't cover: it can only be added without paying. */
export const UnaffordableKit: ShopBillStory = {
  args: {
    cost: [{ coin: Coin.Silver, count: 15 }],
    coins: [{ coin: Coin.Silver, count: 9 }],
    affordable: false,
    subject: ShopBillFor.Kit,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Your coins don't cover the kit's price. Add it without paying instead."),
    ).toBeVisible();
  },
};
