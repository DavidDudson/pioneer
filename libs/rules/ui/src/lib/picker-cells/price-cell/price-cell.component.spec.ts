import { Coin, Price } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { PriceCell } from './price-cell.component';

function parts(host: HTMLElement): readonly string[] {
  return [...host.querySelectorAll('fr-text')].map((part) => part.textContent.trim());
}

function price(coins: Partial<Record<Coin, number>>, per?: number): Price {
  return Price.parse({ coins, ...(per === undefined ? {} : { per }) });
}

describe(PriceCell, () => {
  it('shows coins largest first', async () => {
    const host = await renderCell(PriceCell, { price: price({ [Coin.Gold]: 3, [Coin.Silver]: 5 }) });
    expect(parts(host)).toStrictEqual(['3 gp', '5 sp']);
  });

  it('says how many the price buys', async () => {
    const host = await renderCell(PriceCell, { price: price({ [Coin.Copper]: 1 }, 10) });
    expect(parts(host)).toStrictEqual(['1 cp', 'per 10']);
  });

  it('says so when there is no price', async () => {
    const host = await renderCell(PriceCell, { price: undefined });
    expect(host.textContent.trim()).toBe('No price');
  });
});
