import type { DocumentFixture } from './import-fixtures';
import { FOUNDRY_NULL } from './kind-fixtures';

/** Fixture spells, rituals and effects, shaped as `pf2e-8.6.0` has them. */

const SPELL_EFFECTS = { name: 'spell-effects', directory: 'spell-effects' };
const FEAT_EFFECTS = { name: 'feat-effects', directory: 'feat-effects' };

/** A part of a spell's damage as Foundry writes it. */
export function damagePart(formula: string, type: string, kinds: readonly string[] = ['damage']): object {
  return { applyMod: false, category: FOUNDRY_NULL, formula, kinds, materials: [], type };
}

/** Fields every spell has, at Foundry's defaults. */
const SPELL_DEFAULTS = {
  area: FOUNDRY_NULL,
  cost: { value: '' },
  counteraction: false,
  damage: {},
  defense: FOUNDRY_NULL,
  duration: { sustained: false, value: '' },
  range: { value: '' },
  requirements: '',
  target: { value: '' },
};

export function spell(id: string, name: string, system: object): DocumentFixture {
  return { id, name, type: 'spell', system: { ...SPELL_DEFAULTS, ...system } };
}

export const FIREBALL = spell('sxQZ6yqTn0czJxVd', 'Fireball', {
  level: { value: 3 },
  time: { value: '2' },
  range: { value: '500 feet' },
  area: { type: 'burst', value: 20 },
  defense: { save: { basic: true, statistic: 'reflex' } },
  damage: { '0': damagePart('6d6', 'fire') },
  heightening: { damage: { '0': '2d6' }, interval: 1, type: 'interval', area: 0 },
  traits: { rarity: 'common', traditions: ['arcane', 'primal'], value: ['concentrate', 'fire', 'manipulate'] },
});

export const HEAL = spell('rfZpqmj0AIIdkVIs', 'Heal', {
  level: { value: 1 },
  time: { value: '1 to 3' },
  range: { value: 'touch' },
  target: { value: '1 willing living creature or 1 undead' },
  defense: { save: { basic: true, statistic: 'fortitude' } },
  damage: { '0': damagePart('1d8', 'vitality', ['damage', 'healing']) },
  heightening: { damage: { '0': '1d8' }, interval: 1, type: 'interval' },
  traits: { rarity: 'common', traditions: ['divine', 'primal'], value: ['healing', 'manipulate', 'vitality'] },
});

export const COMMAND = spell('aIHY2DArKFqeIrpf', 'Command', {
  level: { value: 1 },
  time: { value: '2' },
  range: { value: '30 feet' },
  target: { value: '1 creature' },
  duration: { sustained: false, value: "until the end of the target's next turn" },
  defense: { save: { basic: false, statistic: 'will' } },
  heightening: { levels: { '5': { target: { value: '10 creatures' } } }, type: 'fixed' },
  traits: { rarity: 'common', traditions: ['arcane', 'divine', 'occult'], value: ['auditory', 'concentrate'] },
});

export const CONSECRATE = spell('vEkM4Ii8DCoEbRqm', 'Consecrate', {
  level: { value: 2 },
  time: { value: '3 days' },
  range: { value: '40 feet' },
  area: { type: 'burst', value: 40 },
  duration: { sustained: false, value: '1 year' },
  cost: { value: 'rare incense and offerings worth a total value of 20 gp × the spell rank' },
  ritual: {
    primary: { check: 'Religion (expert)' },
    secondary: { casters: 2, checks: 'Crafting, Legal Lore or Performance' },
  },
  traits: { rarity: 'uncommon', traditions: [], value: ['consecration'] },
});

export const BLESS_EFFECT: DocumentFixture = {
  id: 'Gqy7K6FnbLtwGpud',
  name: 'Spell Effect: Bless',
  type: 'effect',
  pack: SPELL_EFFECTS,
  system: {
    level: { value: 1 },
    duration: { expiry: 'turn-start', sustained: false, unit: 'minutes', value: 1 },
    start: { initiative: FOUNDRY_NULL, value: 0 },
    tokenIcon: { show: true },
    badge: { labels: ['15 ft.', '25 ft.'], loop: false, type: 'counter', value: 1 },
  },
};

export const RAGE_EFFECT: DocumentFixture = {
  id: 'z3uyCMBddrPK5umr',
  name: 'Effect: Rage',
  type: 'effect',
  pack: FEAT_EFFECTS,
  system: {
    level: { value: 1 },
    duration: { expiry: FOUNDRY_NULL, sustained: false, unit: 'unlimited', value: -1 },
    start: { initiative: FOUNDRY_NULL, value: 0 },
    tokenIcon: { show: true },
    badge: { evaluate: true, reevaluate: 'turn-start', type: 'formula', value: '1d4' },
  },
};

/** Every magic and effect fixture. */
export const MAGIC: readonly DocumentFixture[] = [FIREBALL, HEAL, COMMAND, CONSECRATE, BLESS_EFFECT, RAGE_EFFECT];
