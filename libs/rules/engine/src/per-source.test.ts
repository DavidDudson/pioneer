import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Selector, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { deriveStatistics } from './derive-statistics';
import { EngineMessage } from './messages';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { flatModifier, inPlay } from './testing';

interface Family {
  readonly selector: string;
  readonly per: string;
  readonly base: string;
  readonly domains?: readonly string[];
  readonly kind?: string;
}

/** A family derived per source: a check with no domains unless given. */
function family({ selector, per, base, domains = [], kind = StatisticKind.Check }: Family): StatisticDefinition {
  return StatisticDefinition.parse({ slug: selector, name: selector, selector, domains, base, kind, per });
}

const STRIKE = family({
  selector: 'strike',
  per: 'weapon',
  base: '@weapon.attr + @weapon.prof + @weapon.potency',
  domains: ['check', 'attack-roll', 'strike-attack-roll'],
});
const SPELL_ATTACK = family({
  selector: 'spell-attack',
  per: 'spellcasting',
  base: '@spellcasting.attr + @spellcasting.prof',
  domains: ['spell-attack-roll'],
});
const SPELL_DC = family({ selector: 'spell-dc', per: 'spellcasting', base: '10 + @stat.spell-attack', kind: 'dc' });

const LONGSWORD = { slug: 'longsword', category: 'martial', traits: ['versatile-p'], potency: 1 };
const DAGGER = { slug: 'dagger', category: 'simple', traits: ['agile', 'finesse', 'thrown-10'] };
const SHORTBOW = { slug: 'shortbow', category: 'martial', traits: ['deadly-d10'], range: 60 };
const FIST = { slug: 'fist', category: 'unarmed', traits: ['agile', 'finesse', 'nonlethal'] };

/** A level 3 character, Dexterity higher than Strength: expert in simple weapons, trained in martial and arcane. */
function character(json: object = {}): StatisticInputs {
  return StatisticInputsJson.parse({
    level: 3,
    attributes: { str: 1, dex: 4, con: 2, int: 3, wis: 1, cha: 0 },
    ranks: { 'attack:simple': 'expert', 'attack:martial': 'trained', 'spellcasting:arcane': 'trained' },
    ...json,
  });
}

function derive(
  definitions: readonly StatisticDefinition[],
  inputs: StatisticInputs,
  rules: readonly RuleInPlay[] = [],
): ReadonlyMap<Selector, StatisticResult> {
  return deriveStatistics({ definitions, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs, {
    rules,
    facts: new PredicateFacts([], CORE_NAMESPACES),
  });
}

function totals(results: ReadonlyMap<Selector, StatisticResult>): Record<string, number | undefined> {
  return Object.fromEntries([...results].map(([selector, result]) => [selector, result.ok ? result.total : undefined]));
}

function inputIssues(json: object): readonly FieldIssue[] {
  const result = StatisticInputsJson.safeParse(json);
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** The dagger's Strike for a character with `attributes`. */
function daggerStrike(attributes: object): number | undefined {
  return totals(derive([STRIKE], character({ attributes, weapons: [DAGGER] })))['strike:dagger'];
}

describe('statistics derived per weapon', () => {
  test('each weapon gets its own Strike, under strike:<slug>', () => {
    const results = derive([STRIKE], character({ weapons: [LONGSWORD, DAGGER, SHORTBOW] }));
    // Longsword: Strength 1 + trained 5 + potency 1. Dagger (finesse): Dexterity 4 + expert 7.
    // Shortbow (ranged): Dexterity 4 + trained 5.
    expect(totals(results)).toStrictEqual({ 'strike:dagger': 11, 'strike:longsword': 7, 'strike:shortbow': 9 });
  });

  test('an agile finesse weapon attacks with the higher of Strength and Dexterity', () => {
    const strong = { str: 4, dex: 2, con: 0, int: 0, wis: 0, cha: 0 };
    const dexterous = { ...strong, str: 2, dex: 4 };
    expect(daggerStrike(strong)).toBe(4 + 7);
    expect(daggerStrike(dexterous)).toBe(4 + 7);
    expect(daggerStrike({ ...strong, dex: 4 })).toBe(4 + 7);
  });

  test('the base reads the weapon term by term', () => {
    const longsword = derive([STRIKE], character({ weapons: [LONGSWORD] })).get(Selector.parse('strike:longsword'));
    expect(longsword).toMatchObject({
      ok: true,
      base: [
        { formula: '@weapon.attr', value: 1 },
        { formula: '@weapon.prof', value: 5 },
        { formula: '@weapon.potency', value: 1 },
      ],
    });
  });

  test('removing a weapon removes its Strike, and with no weapons there are none', () => {
    const armed = derive([STRIKE], character({ weapons: [LONGSWORD] }));
    const unarmed = derive([STRIKE], character());
    expect(totals(armed)).toStrictEqual({ 'strike:longsword': 7 });
    expect(totals(unarmed)).toStrictEqual({});
  });

  test("a Strike is in its listed domains and its attack attribute's", () => {
    const rules = [
      inPlay(flatModifier('status', 1, ['strike-attack-roll']), 'heroism'),
      inPlay(flatModifier('circumstance', 2, ['dex-based']), 'dexterous'),
      inPlay(flatModifier('item', 3, ['str-based']), 'mighty'),
    ];
    const results = derive([STRIKE], character({ weapons: [LONGSWORD, SHORTBOW] }), rules);
    expect(totals(results)).toStrictEqual({ 'strike:longsword': 7 + 1 + 3, 'strike:shortbow': 9 + 1 + 2 });
  });

  test('an unarmed attack is a weapon like any other, in the unarmed category', () => {
    const inputs = character({ weapons: [FIST], ranks: { 'attack:unarmed': 'trained' } });
    expect(totals(derive([STRIKE], inputs))).toStrictEqual({ 'strike:fist': 4 + 5 });
  });

  test('a later plain definition of the family selector replaces the family', () => {
    const plain = StatisticDefinition.parse({ ...STRIKE, per: undefined, base: '@level' });
    const results = derive([STRIKE, plain], character({ weapons: [LONGSWORD] }));
    expect(totals(results)).toStrictEqual({ strike: 3 });
  });
});

describe('statistics derived per spellcasting entry', () => {
  const entries = [
    { slug: 'arcane', tradition: 'arcane', attribute: 'int' },
    { slug: 'innate', tradition: 'divine', attribute: 'cha' },
  ];

  test("each entry gets a spell attack and a DC, and the DC reads its own entry's attack base", () => {
    const results = derive([SPELL_ATTACK, SPELL_DC], character({ spellcasting: entries }));
    // Arcane: Intelligence 3 + trained 5. Innate divine: Charisma 0 + untrained 0.
    expect(totals(results)).toStrictEqual({
      'spell-attack:arcane': 8,
      'spell-attack:innate': 0,
      'spell-dc:arcane': 18,
      'spell-dc:innate': 10,
    });
  });

  test('a bonus to spell attack rolls does not reach the DC built on the attack', () => {
    const rules = [inPlay(flatModifier('status', 1, ['spell-attack-roll']), 'bless')];
    const results = derive([SPELL_ATTACK, SPELL_DC], character({ spellcasting: entries.slice(0, 1) }), rules);
    expect(totals(results)).toStrictEqual({ 'spell-attack:arcane': 9, 'spell-dc:arcane': 18 });
  });

  test("the entry's attribute domain reaches both", () => {
    const rules = [inPlay(flatModifier('status', 1, ['int-based']), 'clever')];
    const results = derive([SPELL_ATTACK, SPELL_DC], character({ spellcasting: entries.slice(0, 1) }), rules);
    expect(totals(results)).toStrictEqual({ 'spell-attack:arcane': 9, 'spell-dc:arcane': 19 });
  });

  test('a sibling that is not derived per spellcasting keeps the plain meaning of @stat', () => {
    const results = derive([SPELL_DC], character({ spellcasting: entries.slice(0, 1) }));
    expect(results.get(Selector.parse('spell-dc:arcane'))).toMatchObject({
      ok: false,
      error: message(EngineMessage.MissingStatistic, {
        found: '@stat.spell-attack',
        position: 6,
        selector: 'spell-attack',
      }),
    });
  });
});

describe('source inputs', () => {
  test('two weapons or two entries with one slug are an issue at the second slug', () => {
    const issues = inputIssues({
      level: 1,
      attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      ranks: {},
      weapons: [LONGSWORD, LONGSWORD],
      spellcasting: [
        { slug: 'arcane', tradition: 'arcane', attribute: 'int' },
        { slug: 'arcane', tradition: 'occult', attribute: 'cha' },
      ],
    });
    expect(issues).toStrictEqual([
      { path: ['weapons', 1, 'slug'], message: message(EngineMessage.DuplicateSource, { slug: 'longsword' }) },
      { path: ['spellcasting', 1, 'slug'], message: message(EngineMessage.DuplicateSource, { slug: 'arcane' }) },
    ]);
  });
});
