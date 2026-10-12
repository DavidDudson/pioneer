import { TestBed } from '@angular/core/testing';
import { Coin } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import type { CoinCount } from '../shop-offer';
import { ShopBill } from './shop-bill.component';

interface BillInputs {
  readonly cost: readonly CoinCount[];
  readonly coins: readonly CoinCount[];
  readonly affordable: boolean;
}

async function render({ cost, coins, affordable }: BillInputs): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(ShopBill);
  fixture.componentRef.setInput('cost', cost);
  fixture.componentRef.setInput('coins', coins);
  fixture.componentRef.setInput('affordable', affordable);
  fixture.componentRef.setInput('reasonId', 'why');
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Each row's value, after its term. */
const lines = (host: HTMLElement): string[] =>
  [...host.querySelectorAll('fr-description-item')].map((item) => {
    const value = item.querySelector('fr-text')?.textContent.trim() ?? '';
    return `${item.textContent.replace(value, '').trim()}: ${value}`;
  });

describe(ShopBill, () => {
  it('shows the cost and the coins, largest first', async () => {
    const host = await render({
      cost: [
        { coin: Coin.Gold, count: 1 },
        { coin: Coin.Silver, count: 5 },
      ],
      coins: [
        { coin: Coin.Platinum, count: 1 },
        { coin: Coin.Copper, count: 7 },
      ],
      affordable: true,
    });
    expect(lines(host)).toStrictEqual(['Cost: 1 gp 5 sp', 'Your coins: 1 pp 7 cp']);
    expect(host.querySelector('#why')).toBeNull();
  });

  it('says an item with no price is free, and a character with none has no coins', async () => {
    const host = await render({ cost: [], coins: [], affordable: true });
    expect(lines(host)).toStrictEqual(['Cost: Free', 'Your coins: No coins']);
  });

  it('says why under the reason id when the coins do not cover the cost', async () => {
    const host = await render({ cost: [{ coin: Coin.Gold, count: 2 }], coins: [], affordable: false });
    expect(host.querySelector('#why')?.textContent).toContain("Your coins don't cover the cost.");
  });
});
