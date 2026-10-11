import { describe, expect, test } from 'bun:test';

import { bactrian, FoundryLanguageRarity, foundryConfig, langLabel, TraitList } from './foundry-config';
import { config, lang } from './testing/import-fixtures';

describe('foundryConfig', () => {
  test('reads each trait list, slug to label key', () => {
    expect(config.traitLists.get(TraitList.Action)?.get('manipulate')).toBe('PF2E.TraitManipulate');
    expect([...(config.traitLists.get(TraitList.Creature)?.keys() ?? [])]).toEqual(['dwarf', 'humanoid']);
  });

  test('languages carry their rarity, with common outside the rarity table', () => {
    expect(Object.fromEntries(config.languages)).toEqual({
      common: FoundryLanguageRarity.Common,
      dwarven: FoundryLanguageRarity.Common,
      petran: FoundryLanguageRarity.Uncommon,
      aklo: FoundryLanguageRarity.Rare,
      wildsong: FoundryLanguageRarity.Secret,
    });
  });

  test('senses carry a fixed acuity and unlimited range where Foundry gives them', () => {
    expect(config.senses.get('darkvision')).toEqual({ acuity: 'precise', unlimitedRange: true });
    expect(config.senses.get('scent')).toEqual({ unlimitedRange: false });
  });

  test('damage types are read from the set', () => {
    expect(config.damageTypes).toEqual(['bludgeoning', 'fire', 'untyped']);
  });

  test('throws when Foundry reshapes an export', () => {
    expect(() => foundryConfig({ traits: {}, creature: {}, damage: {} })).toThrow(/actionTraits/u);
  });
});

describe('langLabel', () => {
  test('reads a dotted key from the nested table', () => {
    expect(langLabel(lang, 'PF2E.Actor.Creature.Sense.Type.LowLightVision')).toBe('Low-Light Vision');
  });

  test('is undefined for a missing key, or one naming a table rather than a string', () => {
    expect(langLabel(lang, 'PF2E.TraitNope')).toBeUndefined();
    expect(langLabel(lang, 'PF2E.Actor')).toBeUndefined();
    expect(langLabel(lang, 'PF2E.TraitFire.Deeper')).toBeUndefined();
  });
});

describe('bactrian', () => {
  test.each([
    ['low-light-vision', 'LowLightVision'],
    ['scent', 'Scent'],
    ['electromagnetic-sense', 'ElectromagneticSense'],
  ])('%s is %s', (slug, key) => {
    expect(bactrian(slug)).toBe(key);
  });
});
