import { describe, expect, test } from 'bun:test';

import { ErrataLabel, PaizoStoreUrl, ProductLine } from '@pioneer/rules/sdk';

import { parseBookDetails } from './details';

const HEAD = `<span><h1 class="title"><a href="Sources.aspx?ID=216">Player Core</a></h1><b>Product Page</b> <u><a href="https://store.paizo.com/pathfinder-player-core/">Paizo Store</a></u><br /><b>Latest Errata</b> Spring 2026, 1st Printing - 2/6/2026<br /><b>Release Date</b> 11/15/2023<br /><b>Product Line</b> Rulebooks<br /><i>These entries</i>`;

describe('parseBookDetails', () => {
  test('reads the product line, store link, errata and release date', () => {
    expect(parseBookDetails(HEAD)).toEqual({
      productLine: ProductLine.Rulebooks,
      storeUrl: PaizoStoreUrl.parse('https://store.paizo.com/pathfinder-player-core/'),
      errata: ErrataLabel.parse('Spring 2026, 1st Printing - 2/6/2026'),
      released: '2023-11-15',
    });
  });

  test('leaves out what the page does not give', () => {
    expect(parseBookDetails('<b>Product Line</b> Lost Omens<br />')).toEqual({ productLine: ProductLine.LostOmens });
  });

  test('ignores a product line it does not know', () => {
    expect(parseBookDetails('<b>Product Line</b> Board Games<br />')).toEqual({});
  });

  test('ignores a store link that is not the Paizo Store', () => {
    const page = '<b>Product Page</b> <u><a href="https://example.com/x">Shop</a></u><br />';
    expect(parseBookDetails(page)).toEqual({});
  });
});
