import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { button, openShop, patchSent, present, settle, VALEROS } from '../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';

/** The names the shop lists, in order. */
const offered = (shop: HTMLElement): string[] =>
  [...shop.querySelectorAll('pio-shop-offers fr-list-item')].map((item) =>
    present(item.querySelector('fr-text')).textContent.trim(),
  );

/** Types `text` into the shop's search and waits for the list to follow it. */
async function search(shop: HTMLElement, text: string): Promise<void> {
  const box = present(shop.querySelector<HTMLInputElement>('fr-search-input input'));
  box.value = text;
  box.dispatchEvent(new Event('input'));
  await vi.waitFor(async () => {
    await settle();
    expect(offered(shop).every((name) => name.toLowerCase().includes(text))).toBe(true);
  });
}

/** The chip whose label starts with `label`, inside the facet filter. */
const chip = (shop: HTMLElement, label: string): HTMLElement =>
  present(
    [...shop.querySelectorAll<HTMLElement>('pio-facet-filter button[aria-pressed]')].find((each) =>
      each.textContent.trim().startsWith(label),
    ),
  );

/** Picks the offer `name` and returns its order form. */
async function pickOffer(shop: HTMLElement, name: string): Promise<HTMLElement> {
  present(shop.querySelector<HTMLElement>(`button[aria-label="Pick ${name}"]`)).click();
  await settle();
  return present(shop.querySelector<HTMLElement>('pio-shop-order'));
}

/** The bill's rows, each its term and value. */
const bill = (order: HTMLElement): string[] =>
  [...order.querySelectorAll('pio-shop-bill fr-description-item')].map((item) => {
    const value = present(item.querySelector('fr-text')).textContent.trim();
    return `${item.textContent.replace(value, '').trim()}: ${value}`;
  });

describe('Shop', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('opens on Available to you, hiding items above the character’s level until everything is shown', async () => {
    const shop = await openShop();
    expect(shop.textContent).toContain('Available to you: level 1 or lower');
    expect(offered(shop)).toContain('Rope');
    expect(offered(shop)).not.toContain('Flame-tongue');
    button(shop, 'Show everything').click();
    await vi.waitFor(async () => {
      await settle();
      expect(offered(shop)).toContain('Flame-tongue');
    });
    expect(shop.textContent).not.toContain('Available to you');
  });

  it('adds a picked item without paying as giftItem, loose, and shows it was added', async () => {
    const shop = await openShop();
    present(shop.querySelector<HTMLElement>('button[aria-label="Pick Diamond"]')).click();
    await settle();
    const order = present(shop.querySelector<HTMLElement>('pio-shop-order'));
    expect(order.textContent).toContain('Diamond');
    button(order, 'Add without paying').click();
    const request = await patchSent();
    expect(request.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'giftItem', item: itemFixtureId(ItemFixture.Diamond), quantity: 1 },
    });
    request.flush({ character: { ...VALEROS, version: 4 }, slots: [], cleared: [], languages: { known: [], open: 0 } });
    await vi.waitFor(async () => {
      await settle();
      expect(present(shop.querySelector('pio-shop-order')).textContent).toContain('Added');
    });
  });

  it('shows the cost against the character’s coins, and buys a picked item as buyItem', async () => {
    const shop = await openShop();
    const order = await pickOffer(shop, 'Longsword');
    expect(bill(order)).toStrictEqual(['Cost: 1 gp', 'Your coins: 15 gp']);
    button(order, 'Buy').click();
    const request = await patchSent();
    expect(request.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'buyItem', item: itemFixtureId(ItemFixture.Longsword), quantity: 1 },
    });
    request.flush({ character: { ...VALEROS, version: 4 }, slots: [], cleared: [], languages: { known: [], open: 0 } });
    await vi.waitFor(async () => {
      await settle();
      expect(present(shop.querySelector('pio-shop-order')).textContent).toContain('Bought');
    });
  });

  it('disables Buy, with the reason, when the coins do not cover the quantity', async () => {
    const shop = await openShop();
    const order = await pickOffer(shop, 'Longsword');
    const quantity = present(order.querySelector<HTMLInputElement>('fr-number-field input'));
    quantity.value = '16';
    quantity.dispatchEvent(new Event('input'));
    await settle();
    expect(bill(order)).toStrictEqual(['Cost: 16 gp', 'Your coins: 15 gp']);
    const buy = button(order, 'Buy');
    expect(buy.hasAttribute('disabled')).toBe(true);
    const reasonId = present(buy.getAttribute('aria-describedby'));
    const reason = present(order.querySelector(`#${reasonId}`));
    expect(reason.textContent).toContain("Your coins don't cover the cost.");
    expect(button(order, 'Add without paying').hasAttribute('disabled')).toBe(false);
  });

  it('shows the server’s reason under Buy when it refuses the purchase', async () => {
    const shop = await openShop();
    const order = await pickOffer(shop, 'Longsword');
    button(order, 'Buy').click();
    const request = await patchSent();
    request.flush(
      {
        type: 'validation',
        title: 'Validation failed',
        status: 422,
        message: { key: 'problem.validation' },
        issues: [{ path: ['patch', 'quantity'], message: { key: 'character.validation.cannotAfford' } }],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await vi.waitFor(async () => {
      await settle();
      expect(order.textContent).toContain("This character can't afford that");
    });
  });

  it('drops the picked item’s form once the list no longer offers it', async () => {
    const shop = await openShop();
    present(shop.querySelector<HTMLElement>('button[aria-label="Pick Diamond"]')).click();
    await settle();
    expect(shop.querySelector('pio-shop-order')).not.toBeNull();
    await search(shop, 'rop');
    expect(shop.querySelector('pio-shop-order')).toBeNull();
  });

  it('keeps the filters in the URL, and takes a facet out of it once nothing in it is picked', async () => {
    const shop = await openShop();
    const router = TestBed.inject(Router);
    chip(shop, 'Armor').click();
    await vi.waitFor(async () => {
      await settle();
      expect(router.url).toContain('f.item-kind=armor');
    });
    expect(router.url).toContain('f.level=..1');
    expect(offered(shop)).toStrictEqual(['Hide-armor', 'Leather-armor', 'Rune-armor']);
    chip(shop, 'Armor').click();
    await vi.waitFor(async () => {
      await settle();
      expect(router.url).not.toContain('f.item-kind');
    });
    expect(offered(shop)).toContain('Rope');
  });

  it('opens with the filters a link carries, in place of the preset', async () => {
    const shop = await openShop('?f.item-kind=shield');
    expect(offered(shop)).toStrictEqual(['Steel-shield']);
    expect(shop.textContent).not.toContain('Available to you');
  });

  it('narrows the list by name', async () => {
    const shop = await openShop();
    await search(shop, 'rop');
    expect(offered(shop)).toStrictEqual(['Rope']);
  });
});
