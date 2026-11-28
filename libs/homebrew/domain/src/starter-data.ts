import { ContentKind } from '@pioneer/rules/sdk';
import type { JsonValue } from '@pioneer/rules/sdk';

const ZERO_ATTRIBUTES = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
const ONE_ACTION = { type: 'actions', cost: 'one' };
const WEIGHTLESS = 'negligible';
const NO_DAMAGE = { dice: 1, die: 'd4', damageType: 'bludgeoning' };

const ANCESTRY = {
  hitPoints: 6,
  size: 'medium',
  speed: 25,
  boosts: [],
  flaws: [],
  languages: [],
  additionalLanguages: { count: 0, options: [] },
  reach: 5,
};

const COMPANION_SPECIES = {
  block: {
    size: 'medium',
    attributes: ZERO_ATTRIBUTES,
    ancestryHp: 6,
    extraSkill: 'acrobatics',
    speed: 25,
    attacks: [{ slug: 'jaws', attribute: 'str', damage: NO_DAMAGE }],
  },
};

const CREATURE = {
  role: 'monster',
  size: 'medium',
  perception: 0,
  attributes: ZERO_ATTRIBUTES,
  armorClass: 10,
  saves: { fortitude: 0, reflex: 0, will: 0 },
  hitPoints: 1,
  immunities: [],
  weaknesses: [],
  resistances: [],
  speed: 25,
};

const DEITY = {
  category: 'deity',
  domains: { primary: [], alternate: [] },
  font: [],
  attributes: [],
  skills: [],
  weapons: [],
  spells: [],
};

const RITUAL = {
  rank: 1,
  time: { type: 'time', count: 1, unit: 'day' },
  primary: { skills: ['skill:arcana'] },
  secondary: { checks: [] },
};

const WEAPON = {
  bulk: WEIGHTLESS,
  category: 'simple',
  damage: NO_DAMAGE,
  usage: { type: 'held', hands: 'one' },
};

/**
 * The `data` a new entry starts with, per kind: the least that satisfies the kind's schema, so an author can create
 * the entry before the kind's form exists. Raw JSON; `ContentEntry` checks it when an entry is made, and a spec checks
 * every kind here. Archetype and kit are missing: their data names other entries, and no entry can stand in for those.
 */
const STARTER_DATA = new Map<ContentKind, JsonValue>([
  [ContentKind.Action, {}],
  [ContentKind.Ancestry, ANCESTRY],
  [ContentKind.AncestryFeature, {}],
  [ContentKind.Armor, { bulk: WEIGHTLESS, category: 'unarmored', acBonus: 0 }],
  [ContentKind.Background, { boosts: [] }],
  [ContentKind.Class, { keyAttribute: ['str'], hitPoints: 6, additionalSkills: 0 }],
  [ContentKind.ClassFeature, {}],
  [ContentKind.CompanionSpecies, COMPANION_SPECIES],
  [ContentKind.Condition, { valued: false, overrides: [], implies: [] }],
  [ContentKind.Consumable, { bulk: WEIGHTLESS, category: 'other' }],
  [ContentKind.Creature, CREATURE],
  [ContentKind.DamageType, {}],
  [ContentKind.Deity, DEITY],
  [ContentKind.Effect, { category: 'other', duration: { type: 'unlimited' } }],
  [ContentKind.Environment, {}],
  [ContentKind.Equipment, { bulk: WEIGHTLESS }],
  [ContentKind.Feat, { category: 'general' }],
  [ContentKind.Heritage, {}],
  [ContentKind.Language, {}],
  [ContentKind.Ritual, RITUAL],
  [ContentKind.Rune, { type: 'property', bulk: WEIGHTLESS, etchedOnto: { item: 'weapon' } }],
  [ContentKind.Sense, {}],
  [ContentKind.Shield, { bulk: WEIGHTLESS, hardness: 0, hitPoints: 1, acBonus: 0 }],
  [ContentKind.Spell, { rank: 1, time: ONE_ACTION, traditions: [], damage: [] }],
  [ContentKind.SpellcastingTradition, { skill: 'skill:arcana' }],
  [ContentKind.Statistic, { selector: 'skill:custom', domains: [], base: '10', kind: 'check' }],
  [ContentKind.Trait, { appliesTo: [] }],
  [ContentKind.Treasure, { bulk: WEIGHTLESS }],
  [ContentKind.VariantRule, {}],
  [ContentKind.Weapon, WEAPON],
]);

/** The kinds an author can start an entry of: those whose starter data needs no other entry. */
export const HOMEBREW_ENTRY_KINDS: ReadonlyArray<ContentKind> = [...STARTER_DATA.keys()];

/** The `data` a new entry of `kind` starts with; `undefined` for a kind that cannot be started without another entry. */
export function starterData(kind: ContentKind): JsonValue | undefined {
  return STARTER_DATA.get(kind);
}
