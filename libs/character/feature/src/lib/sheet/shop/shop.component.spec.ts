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

/** The chip whose label starts with `label`, inside the facet filter. */
const chip = (shop: HTMLElement, label: string): HTMLElement =>
  present(
    [...shop.querySelectorAll<HTMLElement>('pio-facet-filter button[aria-pressed]')].find((each) =>
      each.textContent.trim().startsWith(label),
    ),
  );

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

  it('adds a picked item without paying as giftItem, loose, then clears the pick', async () => {
    const shop = await openShop();
    present(shop.querySelector<HTMLElement>('button[aria-label="Pick Diamond"]')).click();
    await settle();
    const gift = present(shop.querySelector<HTMLElement>('pio-shop-gift'));
    expect(gift.textContent).toContain('Diamond');
    button(gift, 'Add without paying').click();
    const request = await patchSent();
    expect(request.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'giftItem', item: itemFixtureId(ItemFixture.Diamond), quantity: 1 },
    });
    request.flush({ character: { ...VALEROS, version: 4 }, slots: [], cleared: [] });
    await vi.waitFor(async () => {
      await settle();
      expect(shop.querySelector('pio-shop-gift')).toBeNull();
    });
  });

  it('keeps the filters in the URL, and opens from a link with them', async () => {
    const shop = await openShop();
    chip(shop, 'Armor').click();
    await vi.waitFor(async () => {
      await settle();
      expect(TestBed.inject(Router).url).toContain('f.item-kind=armor');
    });
    expect(offered(shop)).toStrictEqual(['Hide-armor', 'Leather-armor', 'Rune-armor']);
  });

  it('opens with the filters a link carries', async () => {
    const shop = await openShop('?f.item-kind=shield');
    expect(offered(shop)).toStrictEqual(['Steel-shield']);
  });

  it('narrows the list by name', async () => {
    const shop = await openShop();
    const search = present(shop.querySelector<HTMLInputElement>('fr-search-input input'));
    search.value = 'rop';
    search.dispatchEvent(new Event('input'));
    await vi.waitFor(async () => {
      await settle();
      expect(offered(shop)).toStrictEqual(['Rope']);
    });
  });
});
