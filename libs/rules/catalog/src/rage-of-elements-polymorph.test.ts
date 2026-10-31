import { describe, expect, test } from 'bun:test';

import { contentPackFromContents } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { rageOfElementsPack } from './json-packs';

const ENTRIES = contentPackFromContents(await rageOfElementsPack()).otherEntries;

const CLUMSY = '69f88e3c-d871-5fb9-82c6-120348a7c0e8';
const IMMOBILIZED = '64278392-4910-5a32-b819-56f6e54952dd';

/** `value` as plain JSON, so a test can compare it with the data it reads. */
function plain(value: unknown): unknown {
  return structuredClone(value);
}

function effect(slug: string): ContentEntry {
  const found = ENTRIES.find((entry) => entry.slug === slug);
  if (found === undefined) {
    throw new Error(`${slug} is not in the rage-of-elements pack`);
  }
  return found;
}

describe('Rage of Elements: polymorph effects', () => {
  test('Body of Air can be sustained for 5 minutes, and its physical resistance heightens with level', () => {
    const body = effect('effect:effect-body-of-air');

    expect(plain(body.data)).toMatchObject({
      duration: { type: 'time', count: 5, unit: 'minute', sustained: true },
    });
    expect(plain(body.rules)).toContainEqual({ key: 'Resistance', type: ['physical'], value: '@level - 6' });
  });

  test('Witchwood Seed: success slows the target, failure makes it clumsy 2 and immobilized', () => {
    const rules = plain(effect('effect:effect-witchwood-seed').rules);

    expect(rules).toContainEqual({
      key: 'FlatModifier',
      selectors: ['all-speeds'],
      type: 'status',
      value: -10,
      predicate: ['witchwood-seed:success'],
    });
    const failed = [{ or: ['witchwood-seed:failure', 'witchwood-seed:critical-failure'] }];
    expect(rules).toContainEqual({ key: 'GrantItem', item: CLUMSY, value: 2, predicate: failed });
    expect(rules).toContainEqual({ key: 'GrantItem', item: IMMOBILIZED, predicate: failed });
  });
});
