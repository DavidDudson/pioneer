import { array, constant, constantFrom, integer, oneof, record, stringMatching, uniqueArray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { FrequencyPeriod } from '../action';
import { ATTRIBUTE_MODIFIER_MAX, ATTRIBUTE_MODIFIER_MIN } from '../attribute';
import { MovementType, StrikeRange } from '../creature-stat-block';
import { ActionCost } from '../rich-text';
import { SpellPreparation } from '../rule-element-spellcasting';
import { SenseAcuity } from '../sense';
import { SPELL_RANK_MAX } from '../spell-rank';
import { MagicTradition } from '../spellcasting-tradition';
import { DieSize } from '../weapon';
import {
  contentIdJson,
  damageType,
  LIST_MAX,
  positive,
  size,
  slugText,
  smallint,
  withOptional,
} from './json-arbitraries';
import { richTextJson } from './rich-text-arbitraries';
import { ruleElementJson } from './rule-element-arbitraries';

const USES_MAX = 9;
const MODIFIER_MAX = 40;
const RULES_MAX = 1;

const contentTextJson: Arbitrary<string> = stringMatching(/^[A-Za-z][A-Za-z ]{0,19}$/u);
const modifier: Arbitrary<number> = integer({ min: -MODIFIER_MAX, max: MODIFIER_MAX });
const uses: Arbitrary<number> = integer({ min: 1, max: USES_MAX });
const slugs: Arbitrary<string[]> = uniqueArray(slugText, { maxLength: LIST_MAX });
const rules: Arbitrary<object[]> = array(ruleElementJson, { maxLength: RULES_MAX });

const acuity: Arbitrary<string> = constantFrom(...Object.values(SenseAcuity));
const movement: Arbitrary<string> = constantFrom(...Object.values(MovementType));
const die: Arbitrary<string> = constantFrom(...Object.values(DieSize));
const strikeRange: Arbitrary<string> = constantFrom(...Object.values(StrikeRange));
const period: Arbitrary<string> = constantFrom(...Object.values(FrequencyPeriod));
const tradition: Arbitrary<string> = constantFrom(...Object.values(MagicTradition));
const preparation: Arbitrary<string> = constantFrom(...Object.values(SpellPreparation));
const costs: Arbitrary<string> = constantFrom(ActionCost.One, ActionCost.Two, ActionCost.Three, ActionCost.Free);
const spellRank: Arbitrary<number> = integer({ min: 1, max: SPELL_RANK_MAX });

const skill = withOptional(record({ skill: slugText, modifier }), { note: richTextJson });
const sense = withOptional(record({ sense: slugText }), { acuity, range: smallint });
const speed = withOptional(record({ movement, speed: smallint }), { note: richTextJson });
const damage = withOptional(record({ dice: smallint, damageType }), { die, bonus: smallint });
const strikeCore = record({
  name: contentTextJson,
  range: strikeRange,
  bonus: modifier,
  damage: array(damage, { maxLength: LIST_MAX }),
  traits: slugs,
});
const strike = withOptional(strikeCore, { reach: smallint, increment: smallint, effects: richTextJson });

const frequency = record({ max: uses, per: period });
const reaction = record({
  name: contentTextJson,
  cost: constant(ActionCost.Reaction),
  trigger: richTextJson,
  traits: slugs,
  description: richTextJson,
  rules,
});
const costedCore = record({ name: contentTextJson, traits: slugs, description: richTextJson, rules });
const costed = withOptional(costedCore, {
  cost: costs,
  trigger: richTextJson,
  requirements: richTextJson,
  frequency,
});
const ability = oneof(reaction, costed);

const spell = withOptional(record({ spell: contentIdJson, rank: spellRank }), {
  uses,
  constant: constant(true),
});
const spellcastingCore = record({
  name: contentTextJson,
  tradition,
  preparation,
  dc: smallint,
  spells: array(spell, { maxLength: LIST_MAX }),
});
const spellcasting = withOptional(spellcastingCore, { attack: modifier });
const item = withOptional(record({ item: contentIdJson }), { quantity: positive });

const attributeModifier: Arbitrary<number> = integer({ min: ATTRIBUTE_MODIFIER_MIN, max: ATTRIBUTE_MODIFIER_MAX });
const adjustments: Arbitrary<object[]> = array(record({ type: damageType, value: positive }), { maxLength: LIST_MAX });
const attributes = record({
  str: attributeModifier,
  dex: attributeModifier,
  con: attributeModifier,
  int: attributeModifier,
  wis: attributeModifier,
  cha: attributeModifier,
});
const saves = record({ fortitude: modifier, reflex: modifier, will: modifier });

const creatureCore: Arbitrary<object> = record({
  size,
  perception: modifier,
  attributes,
  armorClass: smallint,
  saves,
  hitPoints: smallint,
  immunities: array(slugText, { maxLength: LIST_MAX }),
  weaknesses: adjustments,
  resistances: adjustments,
  speed: smallint,
});

/** A creature's `data`: the core numbers with any subset of the optional stat block parts. */
export const creatureData: Arbitrary<object> = withOptional(creatureCore, {
  skills: array(skill, { maxLength: LIST_MAX }),
  senses: array(sense, { maxLength: LIST_MAX }),
  languages: slugs,
  speeds: array(speed, { maxLength: LIST_MAX }),
  strikes: array(strike, { maxLength: LIST_MAX }),
  abilities: array(ability, { maxLength: LIST_MAX }),
  spellcasting: array(spellcasting, { maxLength: LIST_MAX }),
  items: array(item, { maxLength: LIST_MAX }),
  conditions: slugs,
  recallKnowledge: richTextJson,
});
