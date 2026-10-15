import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import type { GapLog } from './kind-data-gaps';
import { bulkOf, priceOf, usageOf } from './physical-fields';
import { runeSlug } from './translate-rune';

function freshLog(): GapLog {
  return { entry: ContentId.parse('00000000-0000-5000-8000-000000000000'), gaps: [] };
}

describe('bulkOf', () => {
  test.each([
    [0, 'negligible'],
    [0.1, 'light'],
    [1, 1],
    [16, 16],
  ] as const)('%p is %p', (value, bulk) => {
    expect(String(bulkOf(value))).toBe(String(bulk));
  });

  test.each([0.2, 1.5, -1])('%p has no mapping', (value) => {
    expect(bulkOf(value)).toBeUndefined();
  });
});

describe('priceOf', () => {
  test('unpaid coins are left out, largest first', () => {
    expect(priceOf({ value: { cp: 0, gp: 3, pp: 0, sp: 5 } })).toEqual({ price: { coins: { gp: 3, sp: 5 } } });
  });

  test('a batch price keeps its count; a price for one has none', () => {
    expect(priceOf({ value: { sp: 1 }, per: 10 })).toEqual({ price: { coins: { sp: 1 }, per: 10 } });
    expect(priceOf({ value: { gp: 360 }, per: 1 })).toEqual({ price: { coins: { gp: 360 } } });
  });

  test('no price when every coin is zero or there is none', () => {
    expect(priceOf({ value: { gp: 0 } })).toEqual({});
    expect(priceOf(undefined)).toEqual({});
  });
});

describe('usageOf', () => {
  test.each([
    ['held-in-one-hand', { type: 'held', hands: 'one' }],
    ['held-in-one-plus-hands', { type: 'held', hands: 'one-plus' }],
    ['held-in-two-hands', { type: 'held', hands: 'two' }],
    ['worn', { type: 'worn' }],
    ['worncloak', { type: 'worn', slot: 'cloak' }],
    ['affixed-to-armor-or-a-weapon', { type: 'affixed', to: 'armor-or-a-weapon' }],
    ['attached-to-crossbow-or-firearm-scope', { type: 'attached', to: 'crossbow-or-firearm-scope' }],
    ['applied-to-a-weapon', { type: 'applied', to: 'a-weapon' }],
    ['installed-in-armor', { type: 'installed', to: 'armor' }],
    ['installed-on-a-weapon-without-a-silencer', { type: 'installed', to: 'a-weapon-without-a-silencer' }],
    ['tattooed-on-the-body', { type: 'tattooed' }],
    ['implanted', { type: 'implanted' }],
    ['carried', { type: 'carried' }],
    ['other', { type: 'other' }],
    ['bonded', { type: 'other' }],
  ] as const)('%s', (usage, expected) => {
    const log = freshLog();

    expect(usageOf(usage, log)).toEqual(expected);
    expect(log.gaps).toEqual([]);
  });

  test.each(['held-in-one-or-two-hands', 'touched'])('%s is reported', (usage) => {
    const log = freshLog();

    expect(usageOf(usage, log)).toBeUndefined();
    expect(log.gaps.map(({ field, raw }) => [field, raw])).toEqual([['usage', usage]]);
  });
});

describe('runeSlug', () => {
  test.each([
    ['flaming', 'flaming'],
    ['greaterFlaming', 'flaming-greater'],
    ['ghostTouch', 'ghost-touch'],
    ['greaterEnergyResistant', 'energy-resistant-greater'],
    ['majorSlick', 'slick-major'],
    ['speed', 'quickstrike'],
    ['greater', 'greater'],
  ] as const)('%s is %s', (key, slug) => {
    expect(runeSlug(key)).toBe(slug);
  });
});
