import { describe, expect, test } from 'bun:test';

import { FormulaMessage } from '@pioneer/rules/formula';
import { fieldIssues, message, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';
import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const SHIELD_BLOCK = '5c2d9a7e-3b1f-5e8c-a4d6-7f0b1c2e3d4f';

/** Remastered content written as rule elements, one or more per key. */
const examples: object[] = [
  { key: 'GrantItem', item: SHIELD_BLOCK },
  { key: 'GrantItem', item: { choice: 'weapon-group' }, flag: 'weapon-mastery', allowDuplicate: false },
  {
    key: 'ChoiceSet',
    flag: 'favored-terrain',
    prompt: 'Favored terrain',
    rollOption: 'favored-terrain',
    choices: [
      { value: 'forest', label: 'Forest' },
      { value: 'aquatic', label: 'Aquatic', predicate: ['self:level:5'] },
    ],
  },
  { key: 'ChoiceSet', flag: 'class-feat', choices: { kind: 'ancestry', filter: ['item:trait:fighter'] } },
  { key: 'RollOption', option: 'self:effect:raise-a-shield' },
  {
    key: 'RollOption',
    domain: 'all',
    option: 'self:stance:gorilla-pound',
    toggleable: true,
    value: false,
    suboptions: [{ value: 'fists', label: 'Fists' }],
  },
  { key: 'ItemAlteration', items: ['item:trait:shield'], property: 'hardness', mode: 'add', value: 2 },
  { key: 'ItemAlteration', items: ['item:group:sword'], property: 'traits', mode: 'add', value: 'deadly-d8' },
  { key: 'ItemAlteration', items: ['item:slug:fist'], property: 'damage-type', mode: 'override', value: 'slashing' },
  {
    key: 'FlatModifier',
    selectors: ['ac'],
    type: 'circumstance',
    value: 2,
    predicate: ['self:effect:raise-a-shield'],
    display: { label: 'Raise a Shield' },
  },
  { key: 'FlatModifier', selectors: ['skill-check', 'perception'], type: 'status', value: -1, slug: 'frightened' },
  { key: 'FlatModifier', selectors: ['strike-damage'], type: 'attribute', attribute: 'str', value: '@attr.str' },
  { key: 'AdjustModifier', selectors: ['all'], slug: 'frightened', mode: 'subtract', value: 1 },
  { key: 'AdjustModifier', selectors: ['ac'], slug: 'off-guard', suppress: true, priority: 99 },
  { key: 'Change', selector: 'speed:land', mode: 'add', value: 5 },
  { key: 'Change', selector: 'hit-points', mode: 'multiply', value: 0.5 },
  { key: 'DexterityCap', value: 1 },
  { key: 'MultipleAttackPenalty', selectors: ['strike-attack-roll'], value: -4, predicate: ['item:trait:agile'] },
  { key: 'Proficiency', selector: 'save:will', rank: 'expert' },
  { key: 'Proficiency', selector: 'perception', rank: 'master', predicate: [{ gte: ['self:level', 7] }] },
  { key: 'Proficiency', selector: 'attack:martial', rank: 'expert' },
  { key: 'Proficiency', selector: 'defense:heavy', rank: 'trained' },
  {
    key: 'MartialProficiency',
    kind: 'attack',
    slug: 'advanced-crossbows',
    definition: ['item:category:advanced', 'item:group:crossbow'],
    sameAs: 'martial',
    maxRank: 'expert',
    display: { label: 'Advanced crossbows' },
  },
  {
    key: 'MartialProficiency',
    kind: 'defense',
    slug: 'bulwark-armor',
    definition: ['item:trait:bulwark'],
    value: 'trained',
  },
  { key: 'MartialProficiency', slug: 'firearms', definition: ['item:group:firearm'], visible: false },
];

describe('RuleElement', () => {
  test.each(examples)('reads %o and encodes it back unchanged', (example) => {
    const encoded: unknown = z.encode(RuleElement, RuleElement.parse(example));
    expect(encoded).toStrictEqual(example);
  });

  test('an unknown key names the key', () => {
    expect(issues({ key: 'ActiveEffectLike', path: 'system.attributes.ac.value' })).toStrictEqual([
      { path: ['key'], message: message(RulesMessage.UnknownElement, { key: 'ActiveEffectLike' }) },
    ]);
  });

  test('a missing key points at key', () => {
    expect(issues({ selectors: ['ac'], value: 1 })).toStrictEqual([
      { path: ['key'], message: message(ValidationMessage.InvalidValue) },
    ]);
  });

  test('an unknown field points at the field', () => {
    expect(issues({ key: 'DexterityCap', value: 1, label: 'Armor' })).toStrictEqual([
      { path: ['label'], message: message(ValidationMessage.UnrecognizedKeys, { count: 1, keys: 'label' }) },
    ]);
  });

  test('a problem inside the predicate points into it', () => {
    expect(issues({ key: 'DexterityCap', value: 1, predicate: ['self:armor', 'Heavy'] })).toStrictEqual([
      { path: ['predicate', 1], message: message(RulesMessage.RollOptionFormat) },
    ]);
  });

  test('a modifier needs a target', () => {
    expect(issues({ key: 'FlatModifier', selectors: [], type: 'item', value: 1 })).toStrictEqual([
      { path: ['selectors'], message: message(ValidationMessage.TooSmall, { origin: 'array', minimum: 1 }) },
    ]);
  });

  test('a modifier type outside the closed set points at type', () => {
    expect(issues({ key: 'FlatModifier', selectors: ['ac'], type: 'luck', value: 1 })).toStrictEqual([
      { path: ['type'], message: message(ValidationMessage.InvalidValue) },
    ]);
  });

  test('an attribute modifier names its attribute', () => {
    expect(issues({ key: 'FlatModifier', selectors: ['ac'], type: 'attribute', value: 1 })).toStrictEqual([
      { path: ['attribute'], message: message(ValidationMessage.InvalidValue) },
    ]);
  });

  test('only an attribute modifier may name an attribute', () => {
    expect(issues({ key: 'FlatModifier', selectors: ['ac'], type: 'item', attribute: 'dex', value: 1 })).toStrictEqual([
      { path: ['attribute'], message: message(ValidationMessage.UnrecognizedKeys, { count: 1, keys: 'attribute' }) },
    ]);
  });

  test('a modifier value is a whole number or a formula', () => {
    expect(issues({ key: 'DexterityCap', value: 1.5 })).toStrictEqual([
      { path: ['value'], message: message(ValidationMessage.NoMatch) },
    ]);
  });

  test.each([
    { key: 'AdjustModifier', selectors: ['ac'], mode: 'add', value: 1, suppress: true },
    { key: 'AdjustModifier', selectors: ['ac'], mode: 'add' },
    { key: 'AdjustModifier', selectors: ['ac'] },
  ])('an adjustment sets a mode and value, or suppresses: %o', (element) => {
    expect(issues(element)).toStrictEqual([{ path: [], message: message(RulesMessage.AdjustModeOrSuppress) }]);
  });

  test('a multiple attack penalty is never a bonus', () => {
    expect(issues({ key: 'MultipleAttackPenalty', selectors: ['strike-attack-roll'], value: 1 })).toStrictEqual([
      { path: ['value'], message: message(ValidationMessage.TooBig, { origin: 'number', maximum: 0 }) },
    ]);
  });

  test('only a toggle offers suboptions', () => {
    const element = { key: 'RollOption', option: 'self:stance', suboptions: [{ value: 'a', label: 'A' }] };
    expect(issues(element)).toStrictEqual([
      { path: ['suboptions'], message: message(RulesMessage.SuboptionsNeedToggle) },
    ]);
  });

  test('an item alteration mode must suit its property', () => {
    const element = { key: 'ItemAlteration', items: [], property: 'traits', mode: 'multiply', value: 'agile' };
    expect(issues(element)).toStrictEqual([{ path: ['mode'], message: message(ValidationMessage.InvalidValue) }]);
  });

  test('a Change targets one statistic, never a list', () => {
    expect(issues({ key: 'Change', selector: ['ac'], mode: 'add', value: 1 })).toStrictEqual([
      { path: ['selector'], message: message(ValidationMessage.InvalidType, { expected: 'string' }) },
    ]);
  });

  test('a proficiency raise never lowers to untrained', () => {
    expect(issues({ key: 'Proficiency', selector: 'perception', rank: 'untrained' })).toStrictEqual([
      { path: ['rank'], message: message(ValidationMessage.InvalidValue) },
    ]);
  });

  test('a martial proficiency links only to a weapon or armour category', () => {
    expect(issues({ key: 'MartialProficiency', slug: 'bombs', definition: [], sameAs: 'bomb' })).toStrictEqual([
      { path: ['sameAs'], message: message(ValidationMessage.InvalidValue) },
    ]);
  });

  test('a martial proficiency defines what it covers', () => {
    expect(issues({ key: 'MartialProficiency', slug: 'firearms' })).toStrictEqual([
      { path: ['definition'], message: message(ValidationMessage.InvalidType, { expected: 'array' }) },
    ]);
  });

  test('a formula field reports a bad formula at its path, with the position', () => {
    expect(issues({ key: 'FlatModifier', selectors: ['ac'], type: 'item', value: '1 + @actor.level' })).toStrictEqual([
      {
        path: ['value'],
        message: message(RulesMessage.FoundryReference, { found: '@actor.level', suggestion: '@level', position: 5 }),
      },
    ]);
    expect(issues({ key: 'Change', selector: 'speed:land', mode: 'add', value: 'floor(@level' })).toStrictEqual([
      { path: ['value'], message: message(FormulaMessage.UnexpectedEnd, { position: 13 }) },
    ]);
  });

  test('a martial proficiency rank may be a formula, checked like any other', () => {
    const element = { key: 'MartialProficiency', slug: 'firearms', definition: ['item:group:firearm'] };
    expect(issues({ ...element, value: 'ternary(gte(@level, 5), 2, 1)' })).toStrictEqual([]);
    expect(issues({ ...element, value: '@rank.attack.martial' })).toStrictEqual([]);
    expect(issues({ ...element, value: '@actor.rank' })).toStrictEqual([
      { path: ['value'], message: message(RulesMessage.UnknownReference, { found: '@actor.rank', position: 1 }) },
    ]);
  });
});
