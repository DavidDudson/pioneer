import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Coin, Price } from '@pioneer/rules/sdk';

import { PriceCell } from './price-cell.component';

type PriceStory = StoryObj<PriceCell>;

const meta: Meta<PriceCell> = { title: 'Rules/Picker cells/Price', component: PriceCell };
export default meta;

/** Gold and silver. */
export const Coins: PriceStory = { args: { price: Price.parse({ coins: { [Coin.Gold]: 3, [Coin.Silver]: 5 } }) } };

/** A price for a bundle. */
export const Per: PriceStory = { args: { price: Price.parse({ coins: { [Coin.Copper]: 1 }, per: 10 }) } };

/** An item with no price. */
export const NoPrice: PriceStory = { args: { price: undefined } };
