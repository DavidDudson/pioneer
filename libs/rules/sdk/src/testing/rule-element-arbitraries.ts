import {
  array,
  boolean,
  constant,
  constantFrom,
  dictionary,
  integer,
  oneof,
  record,
  uniqueArray,
  uuid,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { Attribute } from '../attribute';
import { ContentKind } from '../content-kind';
import { DamageAdjustmentTarget, DamageType } from '../damage';
import { DegreeOfSuccess } from '../degree-of-success';
import { ModifierType } from '../modifier-type';
import { Proficiency } from '../proficiency';
import { DamageDiceCategory, DamageProperty } from '../rule-element-damage';
import { NumericAlterationMode, NumericItemProperty, TraitAlterationMode } from '../rule-element-item-alteration';
import { AdjustMode, ChangeMode } from '../rule-element-numbers';
import { ArmorCategory, MartialKind, WeaponCategory } from '../rule-element-proficiency';
import { SlotRank, SpellPreparation } from '../rule-element-spellcasting';
import { SenseAcuity } from '../sense';
import { SPELL_RANK_MAX } from '../spell-rank';
import { MagicTradition } from '../spellcasting-tradition';
import { DieSize } from '../weapon';
import { keyPathText, predicateJson, rollOptionText, validFormulaText } from './arbitraries';
import { richTextJson } from './rich-text-arbitraries';
import {
  anyOf,
  contentText,
  element,
  LIST_MAX,
  modifierValue,
  slugText,
  ruleNumber,
  SMALLINT_MAX,
  targets,
  withOptional,
} from './rule-element-arbitrary-kit';
import {
  adjustDegreeOfSuccess,
  aura,
  creatureSize,
  fastHealing,
  rollTwice,
  substituteRoll,
  tempHp,
} from './rule-element-effect-arbitraries';

const ruleValue = oneof(ruleNumber, validFormulaText);
const nonAttributeTypes = Object.values(ModifierType).filter((type) => type !== ModifierType.Attribute);
const damageType = anyOf(DamageType);

const choiceValue = oneof(uuid(), slugText);
const choiceOption = withOptional(record({ value: choiceValue, label: contentText }), { predicate: predicateJson });
const choiceOptions = array(choiceOption, { minLength: 1, maxLength: LIST_MAX });
const choiceQuery = record({ kind: anyOf(ContentKind), filter: predicateJson });
const suboption = withOptional(record({ value: slugText, label: contentText }), { predicate: predicateJson });
const suboptions = array(suboption, { minLength: 1, maxLength: LIST_MAX });
const choiceRef = record({ choice: slugText });

const flatModifierOptional = { slug: slugText, damageType };

const grantItem = element(
  'GrantItem',
  { item: oneof(uuid(), choiceRef) },
  { flag: slugText, allowDuplicate: boolean(), choices: dictionary(slugText, choiceValue) },
);
const choiceSet = element(
  'ChoiceSet',
  { flag: slugText, choices: oneof(choiceOptions, choiceQuery) },
  { prompt: contentText, rollOption: slugText },
);
const rollOption = element('RollOption', { option: rollOptionText }, { domain: keyPathText, value: boolean() });
const toggle = element(
  'RollOption',
  { option: rollOptionText, toggleable: constant(true) },
  { domain: keyPathText, value: boolean(), suboptions },
);
const numericAlteration = element('ItemAlteration', {
  items: predicateJson,
  property: anyOf(NumericItemProperty),
  mode: anyOf(NumericAlterationMode),
  value: ruleValue,
});
const traitAlteration = element('ItemAlteration', {
  items: predicateJson,
  property: constantFrom('traits', 'materials', 'property-runes'),
  mode: anyOf(TraitAlterationMode),
  value: slugText,
});
const damageTypeAlteration = element('ItemAlteration', {
  items: predicateJson,
  property: constant('damage-type'),
  mode: constant('override'),
  value: damageType,
});
const typedModifier = element(
  'FlatModifier',
  { selectors: targets, value: modifierValue, type: constantFrom(...nonAttributeTypes) },
  flatModifierOptional,
);
const attributeModifier = element(
  'FlatModifier',
  { selectors: targets, value: modifierValue, type: constant(ModifierType.Attribute), attribute: anyOf(Attribute) },
  flatModifierOptional,
);
const adjustModifier = element(
  'AdjustModifier',
  { selectors: targets, mode: anyOf(AdjustMode), value: ruleValue },
  { slug: slugText },
);
const suppressModifier = element(
  'AdjustModifier',
  { selectors: targets, suppress: constant(true) },
  { slug: slugText },
);
const change = element('Change', { selector: keyPathText, mode: anyOf(ChangeMode), value: ruleValue });
const dexterityCap = element('DexterityCap', { value: modifierValue });
const penaltyStep = oneof(integer({ min: -SMALLINT_MAX, max: 0 }), validFormulaText);
const multipleAttackPenalty = element('MultipleAttackPenalty', { selectors: targets, value: penaltyStep });
const raisedRank = constantFrom(...Object.values(Proficiency).filter((rank) => rank !== Proficiency.Untrained));
const proficiency = element('Proficiency', { selector: keyPathText, rank: raisedRank });
const martialProficiency = element(
  'MartialProficiency',
  { slug: slugText, definition: predicateJson },
  {
    kind: anyOf(MartialKind),
    sameAs: anyOf({ ...WeaponCategory, ...ArmorCategory }),
    maxRank: raisedRank,
    value: oneof(raisedRank, validFormulaText),
    visible: boolean(),
  },
);
const BONUS_MAX = 99;
const bonusNumber = integer({ min: -BONUS_MAX, max: BONUS_MAX });
/** A proficiency bonus formula: a number, or a number plus `@level`. */
const bonusFormula: Arbitrary<string> = oneof(
  bonusNumber.map(String),
  bonusNumber.map((bonus) => `${bonus} + @level`),
);
const bonusTable = Object.fromEntries(Object.values(Proficiency).map((rank) => [rank, bonusFormula]));
const proficiencyBonus = element('ProficiencyBonus', { table: record(bonusTable) });
const defenceTypes = (types: Arbitrary<string>): Arbitrary<string[]> =>
  array(types, { minLength: 1, maxLength: LIST_MAX });
const defenceValue = oneof(integer({ min: 1, max: SMALLINT_MAX }), validFormulaText);
const exceptions = { exceptions: array(slugText, { maxLength: LIST_MAX }) };
const immunity = element('Immunity', { type: defenceTypes(slugText) });
const adjustmentTargets = defenceTypes(anyOf(DamageAdjustmentTarget));
const weakness = element('Weakness', { type: adjustmentTargets, value: defenceValue }, exceptions);
const resistance = element('Resistance', { type: adjustmentTargets, value: defenceValue }, exceptions);
const spellcastingEntry = element('SpellcastingEntry', {
  slug: slugText,
  tradition: anyOf(MagicTradition),
  attribute: anyOf(Attribute),
  preparation: anyOf(SpellPreparation),
});

const sense = element(
  'Sense',
  { sense: uuid() },
  { acuity: anyOf(SenseAcuity), range: integer({ min: 1, max: SMALLINT_MAX }) },
);

const SLOTS_MAX = 9;
const spellSlots = element(
  'SpellSlots',
  {
    entry: slugText,
    rank: oneof(anyOf(SlotRank), integer({ min: 1, max: SPELL_RANK_MAX })),
    value: integer({ min: 1, max: SLOTS_MAX }),
  },
  { pool: slugText },
);
const poolSpells = element('PoolSpells', {
  entry: slugText,
  pool: slugText,
  spells: uniqueArray(uuid(), { minLength: 1, maxLength: LIST_MAX }),
});
const deitySpells = element('DeitySpells', { entry: slugText });
const actorTraits = oneof(
  element('ActorTraits', { add: uniqueArray(slugText, { minLength: 1, maxLength: LIST_MAX }) }),
  element('ActorTraits', { remove: uniqueArray(slugText, { minLength: 1, maxLength: LIST_MAX }) }),
);
const strike = element('Strike', { fist: constant(true) });
const diceNumber = integer({ min: 0, max: LIST_MAX });
const diceOptional = { slug: slugText, damageType, category: anyOf(DamageDiceCategory), critical: boolean() };
const dice = (required: Readonly<Record<string, Arbitrary<unknown>>>, optional = {}): Arbitrary<object> =>
  element('DamageDice', { selectors: targets, ...required }, { ...diceOptional, ...optional });
const damageDice = oneof(
  dice({ dieSize: anyOf(DieSize) }, { diceNumber }),
  dice({ diceNumber }),
  dice({ override: record({ damageType }) }),
);
const alteration = (property: string, mode: Arbitrary<string>, value: Arbitrary<unknown>): Arbitrary<object> =>
  element('DamageAlteration', { selectors: targets, property: constant(property), mode, value });
const damageAlteration = oneof(
  alteration(DamageProperty.DiceNumber, anyOf(NumericAlterationMode), ruleValue),
  alteration(DamageProperty.DamageType, constant('override'), damageType),
);
const outcomes = uniqueArray(anyOf(DegreeOfSuccess), { minLength: 1, maxLength: LIST_MAX });
const note = element('Note', { selectors: targets, text: richTextJson }, { title: contentText, outcome: outcomes });
const signatureSpells = element('SignatureSpells', { entry: slugText });
const focusSpells = element('FocusSpells', {
  entry: slugText,
  spells: uniqueArray(uuid(), { minLength: 1, maxLength: LIST_MAX }),
});

const languageAccess = constantFrom('common', 'uncommon', 'rare');
const grantedLanguages = uniqueArray(uuid(), { minLength: 1, maxLength: LIST_MAX });
const languageSlots = integer({ min: 1, max: LIST_MAX });
const language = oneof(
  element('Language', { grant: grantedLanguages }, { slots: languageSlots, access: languageAccess }),
  element('Language', { slots: languageSlots }, { grant: grantedLanguages, access: languageAccess }),
);

/**
 * Valid rule elements of every `key` the SDK knows, as plain JSON (unparsed). Use with
 * `RuleElement.parse` to get the typed value.
 */
export const ruleElementJson: Arbitrary<object> = oneof(
  grantItem,
  choiceSet,
  rollOption,
  toggle,
  numericAlteration,
  traitAlteration,
  damageTypeAlteration,
  typedModifier,
  attributeModifier,
  adjustModifier,
  suppressModifier,
  change,
  dexterityCap,
  multipleAttackPenalty,
  proficiency,
  martialProficiency,
  proficiencyBonus,
  immunity,
  weakness,
  resistance,
  spellcastingEntry,
  sense,
  spellSlots,
  poolSpells,
  deitySpells,
  signatureSpells,
  focusSpells,
  language,
  actorTraits,
  strike,
  damageDice,
  damageAlteration,
  note,
  fastHealing,
  tempHp,
  creatureSize,
  adjustDegreeOfSuccess,
  rollTwice,
  substituteRoll,
  aura,
);
