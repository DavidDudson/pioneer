import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import { MANY_OFFERS, SHOP_OFFERS } from '../testing/shop-fixtures';
import { ShopOffersView } from './shop-offers.component';

type ShopOffersStory = StoryObj<ShopOffersView>;

const meta: Meta<ShopOffersView> = {
  title: 'Rules/Shop Offers',
  component: ShopOffersView,
};
export default meta;

/** While the items load. */
export const Loading: ShopOffersStory = {
  args: { offers: undefined },
};

/** Nothing matches the filters. */
export const Empty: ShopOffersStory = {
  args: { offers: [] },
};

/** A common item, one sold in a batch, an uncommon and a rare one; picking one presses its toggle. */
export const Offers: ShopOffersStory = {
  args: { offers: SHOP_OFFERS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Uncommon')).toBeVisible();
    const pick = canvas.getByRole('button', { name: 'Pick Staff of Fire' });
    await userEvent.click(pick);
    await expect(pick).toHaveAttribute('aria-pressed', 'true');
  },
};

/** More than the list shows: it says how many it left out. */
export const Many: ShopOffersStory = {
  args: { offers: MANY_OFFERS },
};
