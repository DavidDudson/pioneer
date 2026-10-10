import { StatisticInputsJson } from '@pioneer/rules/engine';
import type { RuleInPlay, StatisticInputs } from '@pioneer/rules/engine';
import { flatModifier, inPlay } from '@pioneer/rules/engine/testing';

/**
 * A level 1 human Fighter as Player Core builds one, written out by hand: Strength key attribute, boosts summing to
 * nine (ancestry, background, class and four free) with none past +4.
 *
 * - Fighter ranks: expert in Perception, Fortitude and Reflex, and in simple and martial weapons; trained in Will,
 *   AC (scale mail is medium armor) and class DC.
 * - Skills: Athletics from the Farmhand background; Acrobatics, Intimidation, Medicine and Survival from the class.
 * - Human 8 Hit Points and a 25-foot Speed; fighter 10 Hit Points.
 * - Scale mail caps Dexterity at +2. Strength +4 meets its Strength 2, so it has no check or Speed penalty.
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
    { slug: 'longsword', category: 'martial', traits: ['versatile-p'] },
    { slug: 'javelin', category: 'simple', traits: ['thrown'], range: 30 },
  ],
});

/** Scale mail's item bonus to AC (Player Core). */
export const SCALE_MAIL_AC = 3;
/** A raised steel shield's circumstance bonus to AC (Player Core). */
export const STEEL_SHIELD_AC = 2;

/** The fighter's items with rules, by slug: scale mail's item bonus to AC, and the steel shield's while raised. */
export const level1FighterItems: Readonly<Record<string, RuleInPlay>> = {
  'scale-mail': inPlay(flatModifier('item', SCALE_MAIL_AC, ['ac']), 'scale-mail'),
  'steel-shield': inPlay(
    { ...flatModifier('circumstance', STEEL_SHIELD_AC, ['ac']), predicate: ['self:effect:raise-a-shield'] },
    'steel-shield',
  ),
};

export const level1FighterRules: readonly RuleInPlay[] = Object.values(level1FighterItems);
