import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { HitPoints, RollOption, Size, Trait, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { deriveStatistics } from './derive-statistics';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult, StatisticValue } from './statistic-result';
import { deriveStrikes } from './strikes';
import type { Strike } from './strikes';
import { inPlay, wielded } from './testing';
import { formRule } from './testing/battle-form-fixtures';
import { vitalsInPlay } from './vitals-in-play';

const DEFINITIONS = [
  StatisticDefinition.parse({
    slug: 'statistic:strike',
    name: 'Strike',
    selector: 'strike',
    domains: ['check', 'attack-roll', 'strike-attack-roll'],
    base: '@weapon.attr + @weapon.prof',
    kind: StatisticKind.Check,
    per: 'weapon',
  }),
  StatisticDefinition.parse({
    slug: 'statistic:strike-damage',
    name: 'Strike Damage',
    selector: 'strike-damage',
    domains: ['damage', 'strike-damage'],
    base: '@weapon.damage',
    kind: StatisticKind.Value,
    per: 'weapon',
  }),
];

const LONGSWORD = {
  slug: 'longsword',
  category: 'martial',
  traits: [],
  damage: { dice: 1, die: 'd8', damageType: 'slashing' },
};
const FIST = {
  slug: 'fist',
  category: 'unarmed',
  traits: ['agile', 'finesse', 'nonlethal'],
  damage: { dice: 1, die: 'd4', damageType: 'bludgeoning' },
};
const CLAW = { slug: 'claw', modifier: 15, damage: { dice: 1, die: 'd6', damageType: 'slashing' } };

const FACTS = new PredicateFacts([RollOption.parse('form:plant')], CORE_NAMESPACES);
const CONTENT = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };

/** Level 5, Strength +4: the longsword and the fist both attack at +11 (4 + 5 + 2). */
const CHARACTER = StatisticInputsJson.parse({
  level: 5,
  attributes: { str: 4, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: { 'attack:martial': 'trained', 'attack:unarmed': 'trained' },
  weapons: [wielded(LONGSWORD), wielded(FIST)],
});

function strikesWith(rules: readonly RuleInPlay[]): readonly Strike[] {
  const modifiers = { rules, facts: FACTS };
  const results = deriveStatistics(CONTENT, CHARACTER, modifiers);
  return deriveStrikes(CHARACTER.weapons ?? [], results, {
    inputs: modifiers,
    scope: { statistics: CONTENT, character: CHARACTER },
  });
}

/** A statistic that has a value. */
function valued(result: StatisticResult | undefined): StatisticValue {
  if (result === undefined || !result.ok) {
    throw new Error('expected a statistic with a value');
  }
  return result;
}

/** The first Strike, which every test expects to exist. */
function firstOf(rules: readonly RuleInPlay[]): Strike {
  const [first] = strikesWith(rules);
  if (first === undefined) {
    throw new Error('expected a Strike');
  }
  return first;
}

const slugs = (strikes: readonly Strike[]): string[] => strikes.map(({ weapon }) => weapon.slug);

describe('battle form: Strikes', () => {
  test('without a form the weapons keep their Strikes', () => {
    expect(slugs(strikesWith([]))).toEqual(['longsword', 'fist']);
  });

  test('the form’s Strikes replace the weapon Strikes and the fist', () => {
    const strikes = strikesWith([formRule({ strikes: [CLAW] })]);

    expect(slugs(strikes)).toEqual(['claw']);
  });

  test('a form that keeps the character’s unarmed Strikes leaves the fist but not the weapon', () => {
    const strikes = strikesWith([formRule({ strikes: [CLAW], keepsOwnUnarmed: true })]);

    expect(slugs(strikes)).toEqual(['fist', 'claw']);
  });

  test('the form’s attack modifier stands when it beats the character’s own unarmed one', () => {
    const attack = valued(firstOf([formRule({ strikes: [CLAW] })]).attack);

    expect(Number(attack.total)).toBe(15);
    expect(attack.form).toMatchObject({ source: 'form', own: 11, value: 15 });
  });

  test('the character’s own unarmed attack stands when it is higher', () => {
    const attack = valued(firstOf([formRule({ strikes: [{ ...CLAW, modifier: 8 }] })]).attack);

    expect(Number(attack.total)).toBe(11);
    expect(attack.form).toMatchObject({ source: 'own', own: 11, value: 8 });
  });

  test('a formula attack modifier is read with the character’s level', () => {
    const claw = firstOf([formRule({ strikes: [{ ...CLAW, modifier: '10 + @level' }] })]);

    expect(Number(valued(claw.attack).total)).toBe(15);
  });

  test('the form’s damage has its dice, type, traits and flat damage', () => {
    const rule = formRule({ strikes: [{ ...CLAW, traits: ['agile'], damage: { ...CLAW.damage, modifier: 7 } }] });
    const claw = firstOf([rule]);

    expect(claw.weapon.traits).toEqual([Trait.parse('agile')]);
    expect(claw.weapon.origin).toEqual(rule.origin);
    expect(claw.damage).toMatchObject({ dice: 1, die: 'd6', damageType: 'slashing' });
    expect(Number(valued(claw.damage?.bonus).total)).toBe(7);
  });

  test('a Strike whose predicate does not hold is left out', () => {
    const bite = { ...CLAW, slug: 'bite', predicate: ['form:animal'] };
    const strikes = strikesWith([formRule({ strikes: [CLAW, bite] })]);

    expect(slugs(strikes)).toEqual(['claw']);
  });

  test('extra damage from a DamageDice element applies to the form’s Strike', () => {
    const extra = { key: 'DamageDice', selectors: ['strike-damage'], diceNumber: 1, dieSize: 'd6', damageType: 'fire' };
    const claw = firstOf([formRule({ strikes: [CLAW] }), inPlay(extra, 'torch')]);

    expect(claw.damage?.extra).toMatchObject([{ count: 1, die: 'd6', damageType: 'fire' }]);
  });
});

describe('battle form: temporary Hit Points', () => {
  const scope = { statistics: CONTENT, character: CHARACTER, size: Size.Medium };

  test('the form gives its temporary Hit Points, credited to the form', () => {
    const rule = formRule({ tempHP: 10 });

    expect(vitalsInPlay({ rules: [rule], facts: FACTS }, scope).temporaryHitPoints).toEqual({
      amount: HitPoints.parse(10),
      origins: [rule.origin],
    });
  });

  test('a formula is read with the character’s level', () => {
    const rule = formRule({ tempHP: '@level * 2' });

    expect(vitalsInPlay({ rules: [rule], facts: FACTS }, scope).temporaryHitPoints?.amount).toBe(HitPoints.parse(10));
  });

  test('temporary Hit Points do not add: the highest counts', () => {
    const form = formRule({ tempHP: 10 });
    const spell = inPlay({ key: 'TempHP', value: 15 }, 'false-life');

    const { temporaryHitPoints } = vitalsInPlay({ rules: [form, spell], facts: FACTS }, scope);

    expect(temporaryHitPoints).toEqual({ amount: HitPoints.parse(15), origins: [spell.origin] });
  });

  test('a form with none gives none', () => {
    expect(
      vitalsInPlay({ rules: [formRule({ speeds: { fly: 30 } })], facts: FACTS }, scope).temporaryHitPoints,
    ).toBeUndefined();
  });
});
