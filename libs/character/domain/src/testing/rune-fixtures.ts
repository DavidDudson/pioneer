import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

/** The property runes `ITEM_FIXTURES` holds, by name. */
export const RuneFixture = {
  /** A weapon rune that gives +1 status to Perception, so a test sees its rules work. */
  Flaming: 'flaming',
  Frost: 'frost',
  Shock: 'shock',
  /** A weapon rune for melee weapons only. */
  Keen: 'keen',
  /** An armour rune that gives +1 status to Will. */
  Shadow: 'shadow',
  /** Alignment weapon runes, each refused on a weapon with the other. */
  Holy: 'holy',
  Unholy: 'unholy',
} as const;
export type RuneFixture = (typeof RuneFixture)[keyof typeof RuneFixture];

const PERCEPTION_PLUS_ONE = { key: 'FlatModifier', selectors: ['perception'], type: 'status', value: 1 };

/** A property rune etched onto weapons, optionally only those meeting `restriction`. */
function weaponRune(restriction?: string): MagicItemFields {
  return {
    data: {
      bulk: 'negligible',
      type: 'property',
      etchedOnto: restriction === undefined ? { item: 'weapon' } : { item: 'weapon', restriction },
    },
  };
}

export const RUNES: Readonly<Record<RuneFixture, MagicItemFields>> = {
  [RuneFixture.Flaming]: { ...weaponRune(), rules: [PERCEPTION_PLUS_ONE] },
  [RuneFixture.Frost]: weaponRune(),
  [RuneFixture.Shock]: weaponRune(),
  [RuneFixture.Keen]: weaponRune('melee'),
  [RuneFixture.Holy]: weaponRune('without-unholy-rune'),
  [RuneFixture.Unholy]: weaponRune('without-holy-rune'),
  [RuneFixture.Shadow]: {
    data: { bulk: 'negligible', type: 'property', etchedOnto: { item: 'armor' } },
    rules: [{ key: 'FlatModifier', selectors: ['will'], type: 'status', value: 1 }],
  },
};
