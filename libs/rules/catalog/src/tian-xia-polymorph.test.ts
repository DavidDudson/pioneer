import { describe, expect, test } from 'bun:test';

import { contentPackFromContents } from '@pioneer/rules/sdk';

import { tianXiaCharacterGuidePack } from './json-packs';

const ENTRIES = contentPackFromContents(await tianXiaCharacterGuidePack()).otherEntries;

/** The rules of the effect `slug` as plain JSON, so a test can compare them with the data it reads. */
function rulesOf(slug: string): unknown {
  const found = ENTRIES.find((entry) => entry.slug === slug);
  if (found === undefined) {
    throw new Error(`${slug} is not in the tian-xia-character-guide pack`);
  }
  return structuredClone(found.rules);
}

describe('Tian Xia Character Guide: polymorph effects', () => {
  test('Strength of Eight Legions makes the character Large with its gear, and +2 to melee damage', () => {
    const rules = rulesOf('effect:effect-strength-of-eight-legions');

    expect(rules).toContainEqual({
      key: 'CreatureSize',
      value: 'large',
      resizeEquipment: true,
      reach: { override: 10 },
    });
    expect(rules).toContainEqual({ key: 'FlatModifier', selectors: ['melee-strike-damage'], type: 'status', value: 2 });
  });

  test('Convocation of Earth and Moon makes the character Huge with its gear, and +4 to melee damage', () => {
    const rules = rulesOf('effect:effect-convocation-of-earth-and-moon');

    expect(rules).toContainEqual({
      key: 'CreatureSize',
      value: 'huge',
      resizeEquipment: true,
      reach: { override: 15 },
    });
    expect(rules).toContainEqual({ key: 'FlatModifier', selectors: ['melee-strike-damage'], type: 'status', value: 4 });
  });
});
