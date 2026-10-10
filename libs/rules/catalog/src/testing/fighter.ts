import { StatisticInputsJson } from '@pioneer/rules/engine';
import type { RuleInPlay, StatisticInputs } from '@pioneer/rules/engine';
import { flatModifier, inPlay, wielded } from '@pioneer/rules/engine/testing';
import { PredicateFacts } from '@pioneer/rules/predicate';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { ContentRegistry, RollOption } from '@pioneer/rules/sdk';

import { coreRules } from './core-rules';

/**
 * A level 1 human Fighter as Player Core builds one, written out by hand: Strength key attribute, boosts summing to
 * nine (ancestry, background, class and four free) with none past +4.
 *
 * - Fighter ranks: expert in Perception, Fortitude and Reflex, and in simple and martial weapons; trained in Will,
 *   AC (scale mail is medium armor) and class DC.
 * - Skills: Athletics from the Farmhand background; Acrobatics, Intimidation, Medicine and Survival from the class.
 * - Human 8 Hit Points and a 25-foot Speed; fighter 10 Hit Points.
 * - Scale mail caps Dexterity at +2. Strength +4 meets its Strength +2, so its check and Speed penalties
 *   are inactive.
 * - A longsword in hand and javelins to throw; a javelin's range increment makes it a ranged weapon.
 */
export const level1Fighter: StatisticInputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 4, dex: 1, con: 2, int: 0, wis: 1, cha: 1 },
  ranks: {
    ac: 'trained',
    'save:fortitude': 'expert',
    'save:reflex': 'expert',
    'save:will': 'trained',
    perception: 'expert',
    'skill:acrobatics': 'trained',
    'skill:athletics': 'trained',
    'skill:intimidation': 'trained',
    'skill:medicine': 'trained',
    'skill:survival': 'trained',
    'class-dc': 'trained',
    'attack:simple': 'expert',
    'attack:martial': 'expert',
  },
  dexterityCap: 2,
  ancestry: { hitPoints: 8, speed: 25 },
  class: { hitPoints: 10, keyAttribute: 'str' },
  weapons: [
    wielded({ slug: 'longsword', category: 'martial', traits: ['versatile-p'] }),
    wielded({ slug: 'javelin', category: 'simple', traits: ['thrown'], range: 30 }),
  ],
});

/** Scale mail's item bonus to AC (Player Core). */
export const SCALE_MAIL_AC = 3;
/** Scale mail's check penalty, on Strength- and Dexterity-based skill checks, unless its Strength is met. */
export const SCALE_MAIL_CHECK_PENALTY = -2;
/** Scale mail's Speed penalty, which meeting its Strength reduces by 5 feet, to nothing. */
export const SCALE_MAIL_SPEED_PENALTY = -5;
/** A raised steel shield's circumstance bonus to AC (Player Core). */
export const STEEL_SHIELD_AC = 2;

/** Set while the worn armor's Strength requirement is met; its penalties hold only without it. */
const STRENGTH_MET = 'self:armor:strength-met';
const unlessStrengthMet = { predicate: [{ not: STRENGTH_MET }] };
const whenStrengthMet = { predicate: [STRENGTH_MET] };

/** The skills an armor check penalty applies to: those keyed to Strength or Dexterity. */
const PHYSICAL_SKILLS = ['skill:acrobatics', 'skill:athletics', 'skill:stealth', 'skill:thievery'];

/** What a suit of armor gives: its item bonus to AC (potency included), and its penalties. */
interface Armor {
  readonly ac: number;
  readonly checkPenalty: number;
  readonly speedPenalty: number;
  /** The Speed penalty left once its Strength is met: 5 feet less, so none for a -5 penalty. */
  readonly speedPenaltyWithStrength?: number;
}

/** Armor's rules on entry `slug`: the AC bonus, and the penalties gated by its Strength requirement. */
function armorRules(slug: string, armor: Armor): readonly RuleInPlay[] {
  const { ac, checkPenalty, speedPenalty, speedPenaltyWithStrength } = armor;
  const elements = [
    flatModifier('item', ac, ['ac']),
    { ...flatModifier('item', checkPenalty, PHYSICAL_SKILLS), ...unlessStrengthMet },
    { ...flatModifier('item', speedPenalty, ['all-speeds']), ...unlessStrengthMet },
    ...(speedPenaltyWithStrength === undefined
      ? []
      : [{ ...flatModifier('item', speedPenaltyWithStrength, ['all-speeds']), ...whenStrengthMet }]),
  ];
  return elements.map((element, rule) => inPlay(element, slug, { rule }));
}

/** A shield's circumstance bonus to AC on entry `slug`, while it is raised. */
function shieldRules(slug: string, bonus: number): readonly RuleInPlay[] {
  return [inPlay({ ...flatModifier('circumstance', bonus, ['ac']), predicate: ['self:effect:raise-a-shield'] }, slug)];
}

/** The fighter's items' rules, by item: scale mail's bonus and penalties, and the steel shield's bonus while raised. */
export const level1FighterItems: Readonly<Record<string, readonly RuleInPlay[]>> = {
  'scale-mail': armorRules('scale-mail', {
    ac: SCALE_MAIL_AC,
    checkPenalty: SCALE_MAIL_CHECK_PENALTY,
    speedPenalty: SCALE_MAIL_SPEED_PENALTY,
  }),
  'steel-shield': shieldRules('steel-shield', STEEL_SHIELD_AC),
};

export const level1FighterRules: readonly RuleInPlay[] = Object.values(level1FighterItems).flat();

/** The core rules pack's roll option namespace table, which every fighter predicate is read through. */
export function coreNamespaces(): NamespaceTable {
  const registry = new ContentRegistry();
  registry.register(coreRules);
  return registry.rollOptionNamespaces();
}

/** What the fighter's predicates read: Strength +4 meets scale mail's +2. */
export function level1FighterFacts(): PredicateFacts {
  return new PredicateFacts([RollOption.parse(STRENGTH_MET)], coreNamespaces());
}

/**
 * The same fighter at 20th level, written out by hand as a load for benchmarks: Strength +7 with an apex item;
 * master in Perception, the saves but Will, AC and class DC; legendary in simple and martial weapons and Athletics;
 * full plate (Dexterity cap +0) and four weapons with potency runes.
 */
export const level20Fighter: StatisticInputs = StatisticInputsJson.parse({
  level: 20,
  attributes: { str: 7, dex: 3, con: 4, int: 1, wis: 3, cha: 2 },
  ranks: {
    ac: 'master',
    'save:fortitude': 'master',
    'save:reflex': 'master',
    'save:will': 'expert',
    perception: 'master',
    'skill:acrobatics': 'master',
    'skill:athletics': 'legendary',
    'skill:intimidation': 'master',
    'skill:medicine': 'expert',
    'skill:survival': 'expert',
    'skill:stealth': 'trained',
    'skill:society': 'trained',
    'skill:diplomacy': 'trained',
    'skill:crafting': 'trained',
    'class-dc': 'master',
    'attack:simple': 'legendary',
    'attack:martial': 'legendary',
  },
  dexterityCap: 0,
  ancestry: { hitPoints: 8, speed: 25 },
  class: { hitPoints: 10, keyAttribute: 'str' },
  weapons: [
    wielded({ slug: 'longsword', category: 'martial', traits: ['versatile-p'], potency: 3 }),
    wielded({ slug: 'javelin', category: 'simple', traits: ['thrown'], range: 30, potency: 2 }),
    wielded({
      slug: 'dagger',
      category: 'simple',
      traits: ['agile', 'finesse', 'thrown-10', 'versatile-s'],
      potency: 1,
    }),
    wielded({ slug: 'shortbow', category: 'martial', traits: ['deadly-d10'], range: 60, potency: 2 }),
  ],
});

/** Full plate (+6, Strength +3, check -3, Speed -10) with a +3 potency rune. */
const FULL_PLATE: Armor = { ac: 9, checkPenalty: -3, speedPenalty: -10, speedPenaltyWithStrength: -5 };
/** A skill or save item's bonus at the top of its range (a major or greater item), and one tier below. */
const TOP_ITEM_BONUS = 3;
const LOWER_ITEM_BONUS = 2;
/** Heroism heightened to 9th rank. */
const HEROISM_BONUS = 3;

/** Item bonuses from worn and drunk items, each on its own entry: `[entry, value, selectors]`. The mutagen and the rune
 * both give an item bonus to Fortitude, so only the first counts there. */
const WORN_ITEMS: readonly (readonly [string, number, readonly string[]])[] = [
  ['resilient-rune', TOP_ITEM_BONUS, ['saving-throw']],
  ['survival-item', TOP_ITEM_BONUS, ['skill:survival']],
  ['fortitude-mutagen', TOP_ITEM_BONUS, ['save:fortitude']],
  ['athletics-item', TOP_ITEM_BONUS, ['skill:athletics']],
  ['society-crafting-item', LOWER_ITEM_BONUS, ['skill:society', 'skill:crafting']],
  ['medicine-item', LOWER_ITEM_BONUS, ['skill:medicine']],
  ['intimidation-item', LOWER_ITEM_BONUS, ['skill:intimidation']],
  ['perception-item', LOWER_ITEM_BONUS, ['perception']],
  ['acrobatics-item', LOWER_ITEM_BONUS, ['skill:acrobatics']],
];

/**
 * The level 20 fighter's rules: armor and shield as above, item bonuses that stack only by type, two status bonuses
 * where the lower is suppressed, a situational bonus left conditional, and a condition that is not on.
 */
export const level20FighterRules: readonly RuleInPlay[] = [
  ...armorRules('full-plate', FULL_PLATE),
  ...shieldRules('sturdy-shield', STEEL_SHIELD_AC),
  ...WORN_ITEMS.map(([slug, value, selectors]) => inPlay(flatModifier('item', value, selectors), slug)),
  inPlay(
    {
      ...flatModifier('status', HEROISM_BONUS, ['attack-roll', 'saving-throw', 'skill-check']),
      predicate: ['self:effect:heroism'],
    },
    'heroism',
  ),
  inPlay(
    { ...flatModifier('status', 1, ['attack-roll']), predicate: ['self:effect:courageous-anthem'] },
    'courageous-anthem',
  ),
  inPlay(
    { ...flatModifier('circumstance', 2, ['skill:athletics']), predicate: ['self:action:shove'] },
    'powerful-shove',
  ),
  inPlay({ ...flatModifier('status', -1, ['all']), predicate: ['self:condition:frightened'] }, 'frightened'),
];

/** The situation the level 20 fighter is benchmarked in: Strength met, heroism and an anthem both on. */
export const LEVEL_20_SITUATION: readonly string[] = [
  STRENGTH_MET,
  'self:effect:heroism',
  'self:effect:courageous-anthem',
];
