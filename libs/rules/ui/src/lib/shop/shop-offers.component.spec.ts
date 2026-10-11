import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { LONGSWORD, MANY_OFFERS, SHOP_OFFERS, STAFF_OF_FIRE } from '../testing/shop-fixtures';
import type { ShopOffer } from './shop-offer';
import { ShopOffersView } from './shop-offers.component';

interface Rendered {
  readonly fixture: ComponentFixture<ShopOffersView>;
  readonly host: HTMLElement;
}

async function render(offers: readonly ShopOffer[] | undefined): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(ShopOffersView);
  fixture.componentRef.setInput('offers', offers);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

/** Each row's texts: its name, its badge if any, then its level and price. */
const rows = (host: HTMLElement): string[][] =>
  [...host.querySelectorAll('fr-list-item')].map((item) =>
    [...item.querySelectorAll('fr-text, fr-badge')].map((text) => text.textContent.trim()),
  );

const pickButton = (host: HTMLElement, name: string): HTMLButtonElement | null =>
  host.querySelector<HTMLButtonElement>(`button[aria-label="Pick ${name}"]`);

describe(ShopOffersView, () => {
  it('shows each offer’s name, rarity badge, level and price as written', async () => {
    const { host } = await render(SHOP_OFFERS);
    expect(rows(host)).toStrictEqual([
      ['Longsword', 'Level 0 · 1 gp'],
      ['Arrows', 'Level 0 · 1 sp for 10'],
      ['Staff of Fire', 'Uncommon', 'Level 3 · 60 gp 5 sp'],
      ['Lucky Stone', 'Rare', 'Level 1 · No price'],
    ]);
  });

  it('picks one offer at a time, and unpicks it on a second press', async () => {
    const { fixture, host } = await render(SHOP_OFFERS);
    pickButton(host, 'Longsword')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.picked()).toBe(LONGSWORD.id);
    pickButton(host, 'Staff of Fire')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.picked()).toBe(STAFF_OF_FIRE.id);
    expect(pickButton(host, 'Longsword')?.getAttribute('aria-pressed')).toBe('false');
    pickButton(host, 'Staff of Fire')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.picked()).toBeUndefined();
  });

  it('shows the first 50 and says how many there are', async () => {
    const { host } = await render(MANY_OFFERS);
    expect(host.querySelectorAll('fr-list-item')).toHaveLength(50);
    expect(host.textContent).toContain('Showing 50 of 60. Narrow the filters to see the rest.');
  });

  it('shows placeholders while loading, and an empty state when nothing matches', async () => {
    const loading = await render(undefined);
    expect(loading.host.querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
    TestBed.resetTestingModule();
    const empty = await render([]);
    expect(empty.host.querySelector('fr-empty-state')?.textContent).toContain('No items match');
  });
});
