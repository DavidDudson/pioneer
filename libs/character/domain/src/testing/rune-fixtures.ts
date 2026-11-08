import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

import { clumsyFixtureId } from './condition-fixture-ids';

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
  /** Armour runes made for one damage type, which the crafter chooses when etching them. */
  EnergyResistant: 'energy-resistant',
  EnergyResistantGreater: 'energy-resistant-greater',
  /** A weapon rune made for one creature type, which the crafter chooses when etching it. */
  Bane: 'bane',
  EnergyVulnerability: 'energy-vulnerability',
  EnergyVulnerabilityGreater: 'energy-vulnerability-greater',
  /** Alignment weapon runes, each refused on a weapon with the other. */
  Holy: 'holy',
  Unholy: 'unholy',
  /** A weapon rune that grants the clumsy condition (as quickstrike grants quickened) while the weapon is wielded. */
  Quickstrike: 'quickstrike',
  /** A weapon rune that lets the weapon take the shape of another (the slug is the real shifting rune's). */
  Shifting: 'shifting',
  /** A weapon rune for bludgeoning weapons only, which a weapon shifted into another damage type can't keep. */
  Crushing: 'crushing',
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

/** A property rune etched onto armour, with no rules of its own. */
function armorRune(): MagicItemFields {
  return { data: { bulk: 'negligible', type: 'property', etchedOnto: { item: 'armor' } } };
}

export const RUNES: Readonly<Record<RuneFixture, MagicItemFields>> = {
  [RuneFixture.Flaming]: { ...weaponRune(), rules: [PERCEPTION_PLUS_ONE] },
  [RuneFixture.Frost]: weaponRune(),
  [RuneFixture.Shock]: weaponRune(),
  [RuneFixture.Keen]: weaponRune('melee'),
  [RuneFixture.Bane]: weaponRune(),
  [RuneFixture.EnergyVulnerability]: weaponRune(),
  [RuneFixture.EnergyVulnerabilityGreater]: weaponRune(),
  [RuneFixture.Holy]: weaponRune('without-unholy-rune'),
  [RuneFixture.Unholy]: weaponRune('without-holy-rune'),
  [RuneFixture.Quickstrike]: { ...weaponRune(), rules: [{ key: 'GrantItem', item: clumsyFixtureId() }] },
  [RuneFixture.Shifting]: weaponRune(),
  [RuneFixture.Crushing]: weaponRune('bludgeoning'),
  [RuneFixture.EnergyResistant]: armorRune(),
  [RuneFixture.EnergyResistantGreater]: armorRune(),
  [RuneFixture.Shadow]: {
    data: { bulk: 'negligible', type: 'property', etchedOnto: { item: 'armor' } },
    rules: [{ key: 'FlatModifier', selectors: ['will'], type: 'status', value: 1 }],
  },
};
