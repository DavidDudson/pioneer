import {
  array,
  boolean,
  constant,
  constantFrom,
  double,
  integer,
  oneof,
  option,
  record,
  stringMatching,
  tuple,
  uuid,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { Attribute } from '../attribute';
import { ContentKind } from '../content-kind';
import { DamageType } from '../damage';
import { ModifierType } from '../modifier-type';
import { Proficiency } from '../proficiency';
import { NumericAlterationMode, NumericItemProperty, TraitAlterationMode } from '../rule-element-item-alteration';
import { AdjustMode, ChangeMode } from '../rule-element-numbers';
import { ArmorCategory, MartialKind, WeaponCategory } from '../rule-element-proficiency';
import { keyPathText, predicateJson, rollOptionText, validFormulaText } from './arbitraries';

const LIST_MAX = 3;
const SMALLINT_MAX = 32_767;

/** Kebab-case words: slugs, rule slugs, traits. */
const word: Arbitrary<string> = stringMatching(/^[a-z\d]{1,6}$/u);
const SLUG_WORDS_MAX = 3;
const slugText: Arbitrary<string> = array(word, { minLength: 1, maxLength: SLUG_WORDS_MAX }).map((words) =>
  words.join('-'),
);
const contentText: Arbitrary<string> = stringMatching(/^[A-Za-z][A-Za-z ]{0,19}$/u);
const modifierNumber: Arbitrary<number> = integer({ min: -SMALLINT_MAX, max: SMALLINT_MAX });
const ruleNumber: Arbitrary<number> = double({ noNaN: true, noDefaultInfinity: true });
const targets: Arbitrary<string[]> = array(keyPathText, { minLength: 1, maxLength: LIST_MAX });

type OptionalEntry = readonly [string, unknown];

/** Builds a record whose optional keys are left out (not set to undefined) when absent. */
function withOptional<TRequired extends object>(
  required: Arbitrary<TRequired>,
  optional: Readonly<Record<string, Arbitrary<unknown>>>,
): Arbitrary<object> {
  const optionals = Object.entries(optional).map(([key, value]) =>
    option(value, { nil: undefined }).map((picked): OptionalEntry => [key, picked]),
  );
  return tuple(required, ...optionals).map(([fields, ...entries]): object => {
    const present = entries.filter(([, picked]) => picked !== undefined);
    return Object.fromEntries([...Object.entries(fields), ...present]);
  });
}

const base = {
  predicate: predicateJson,
  priority: modifierNumber,
  display: withOptional(constant({}), { label: contentText, hidden: boolean() }),
};

function element(
  key: string,
  required: Readonly<Record<string, Arbitrary<unknown>>>,
  optional = {},
): Arbitrary<object> {
  return withOptional(record({ key: constant(key), ...required }), { ...base, ...optional });
}

/** Any value of a const object (`ModifierType`, `DamageType`). */
function anyOf<TValue>(values: Readonly<Record<string, TValue>>): Arbitrary<TValue> {
  return constantFrom(...Object.values(values));
}

const modifierValue = oneof(modifierNumber, validFormulaText);
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
  { flag: slugText, allowDuplicate: boolean() },
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
  property: constant('traits'),
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
);
