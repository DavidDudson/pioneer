import { describe, expect, test } from 'bun:test';

import { BaseTermKind, deriveStatistics, LineStatusKind } from '@pioneer/rules/engine';
import type { RuleInPlay, StatisticResult, StatisticValue } from '@pioneer/rules/engine';
import { ContentId, OriginHopKind, Selector } from '@pioneer/rules/sdk';
import type { Origin } from '@pioneer/rules/sdk';

import { core, PWL, SELECTORS, withoutLevel } from './testing/core-rules';
import {
  fighterFacts,
  gear,
  goldenFighter,
  SCALE_MAIL,
  SHIELD_RAISED,
  STEEL_SHIELD,
  STRENGTH_MET,
} from './testing/golden-fighter';

/** A base term as a player checks it: what it reads, its sign and its value. */
interface Term {
  readonly formula: string;
  readonly sign: string;
  readonly value: number;
}

/** A base term with the origin a variant rule gives it. */
interface TermWithOrigin extends Term {
  readonly origin: Origin | undefined;
}

/** A breakdown line as a player checks it: its type, its value, whether it counts, and the entry it is from. */
interface Line {
  readonly type: string;
  readonly value: number | undefined;
  readonly status: string;
  readonly source: ContentId;
}

/** A statistic's breakdown without ids and text positions. */
interface Breakdown {
  readonly total: number;
  readonly base: readonly Term[];
  readonly lines: readonly Line[];
  readonly overrides: readonly unknown[];
}

function valueOf(result: StatisticResult | undefined): StatisticValue {
  if (result?.ok !== true) {
    throw new Error(`Expected a value, got ${JSON.stringify(result)}`);
  }
  return result;
}

/** The base's terms, rounding lines left out (the core pack's bases have none). */
function termsOf({ base }: StatisticValue): readonly TermWithOrigin[] {
  return base.flatMap((term) => (term.kind === BaseTermKind.Term ? [term] : []));
}

function breakdownOf(result: StatisticResult | undefined): Breakdown {
  const value = valueOf(result);
  return {
    total: value.total,
    base: termsOf(value).map(({ formula, sign, value: termValue }) => ({ formula, sign, value: termValue })),
    lines: value.lines.map(({ modifier, value: lineValue, status }) => ({
      type: modifier.type,
      value: lineValue,
      status: status.kind,
      source: modifier.origin.entry,
    })),
    overrides: value.overrides,
  };
}

function breakdowns(derived: ReadonlyMap<Selector, StatisticResult>): Record<string, Breakdown> {
  return Object.fromEntries([...derived].map(([selector, result]) => [selector, breakdownOf(result)]));
}

const plus = (formula: string, value: number): Term => ({ formula, sign: '+', value });

/** A statistic whose base is an attribute and a proficiency bonus, with no lines. */
function check(attribute: Term, proficiency: Term): Breakdown {
  return { total: attribute.value + proficiency.value, base: [attribute, proficiency], lines: [], overrides: [] };
}

function skill(slug: string, attribute: Term, proficiency: number): Breakdown {
  return check(attribute, plus(`@prof.skill.${slug}`, proficiency));
}

/** Scale mail's check penalty, inactive: the golden Fighter meets its Strength. */
const CHECK_PENALTY: Line = { type: 'untyped', value: -2, status: LineStatusKind.Inactive, source: SCALE_MAIL };

function withCheckPenalty(breakdown: Breakdown): Breakdown {
  return { ...breakdown, lines: [CHECK_PENALTY] };
}

/** At 1st level: untrained +0, trained 2 plus the level, expert 4 plus the level. */
const UNTRAINED = 0;
const TRAINED = 3;
const EXPERT = 5;

const STR = plus('@attr.str', 4);
const DEX = plus('@attr.dex', 2);
const CON = plus('@attr.con', 2);
const INT = plus('@attr.int', 0);
const WIS = plus('@attr.wis', 1);
const CHA = plus('@attr.cha', 0);

/**
 * Every statistic the core rules pack derives for the golden Fighter, worked out by hand from Player Core: Strength
 * +4, Dexterity +2, Constitution +2, Intelligence +0, Wisdom +1, Charisma +0 at 1st level.
 */
const GOLDEN: Readonly<Record<string, Breakdown>> = {
  // Dexterity +2 is within scale mail's cap; the shield counts only while Raise a Shield is in effect.
  ac: {
    total: 18,
    base: [plus('10', 10), plus('@attr.dex.capped', 2), plus('@prof.ac', TRAINED)],
    lines: [
      { type: 'item', value: 3, status: LineStatusKind.Applied, source: SCALE_MAIL },
      { type: 'circumstance', value: 2, status: LineStatusKind.Inactive, source: STEEL_SHIELD },
    ],
    overrides: [],
  },
  'save:fortitude': check(CON, plus('@prof.save.fortitude', EXPERT)),
  'save:reflex': check(DEX, plus('@prof.save.reflex', EXPERT)),
  'save:will': check(WIS, plus('@prof.save.will', TRAINED)),
  perception: check(WIS, plus('@prof.perception', EXPERT)),
  'skill:acrobatics': withCheckPenalty(skill('acrobatics', DEX, TRAINED)),
  'skill:arcana': skill('arcana', INT, UNTRAINED),
  'skill:athletics': withCheckPenalty(skill('athletics', STR, TRAINED)),
  'skill:crafting': skill('crafting', INT, UNTRAINED),
  'skill:deception': skill('deception', CHA, UNTRAINED),
  'skill:diplomacy': skill('diplomacy', CHA, UNTRAINED),
  'skill:intimidation': skill('intimidation', CHA, TRAINED),
  'skill:medicine': skill('medicine', WIS, TRAINED),
  'skill:nature': skill('nature', WIS, UNTRAINED),
  'skill:occultism': skill('occultism', INT, UNTRAINED),
  'skill:performance': skill('performance', CHA, UNTRAINED),
  'skill:religion': skill('religion', WIS, UNTRAINED),
  'skill:society': skill('society', INT, UNTRAINED),
  'skill:stealth': withCheckPenalty(skill('stealth', DEX, UNTRAINED)),
  'skill:survival': skill('survival', WIS, TRAINED),
  'skill:thievery': withCheckPenalty(skill('thievery', DEX, UNTRAINED)),
  'class-dc': {
    total: 17,
    base: [plus('10', 10), plus('@attr.key', 4), plus('@prof.class-dc', TRAINED)],
    lines: [],
    overrides: [],
  },
  // Human 8, plus Fighter 10 and Constitution 2 for one level.
  'hp:max': {
    total: 20,
    base: [plus('@ancestry.hp', 8), plus('(@class.hp + @attr.con) * @level', 12)],
    lines: [],
    overrides: [],
  },
  // Scale mail's -5 feet goes away when its Strength is met.
  'speed:land': {
    total: 25,
    base: [plus('@ancestry.speed', 25)],
    lines: [{ type: 'untyped', value: -5, status: LineStatusKind.Inactive, source: SCALE_MAIL }],
    overrides: [],
  },
  // A plain longsword: Strength and expert in martial weapons, and no potency line.
  'strike:longsword': check(plus('@weapon.attr', 4), plus('@weapon.prof', EXPERT)),
};

/**
 * Scale mail's penalties when its Strength is not met: on Speed, applied; on the Strength- and Dexterity-based
 * skills, conditional, since the sheet cannot know whether a check has the attack trait.
 */
const PENALISED: Readonly<Record<string, string[]>> = {
  'skill:acrobatics': [LineStatusKind.Conditional],
  'skill:athletics': [LineStatusKind.Conditional],
  'skill:stealth': [LineStatusKind.Conditional],
  'skill:thievery': [LineStatusKind.Conditional],
  'speed:land': [LineStatusKind.Applied],
};

const VARIANT_HOP = { kind: OriginHopKind.Variant, rule: ContentId.parse(PWL) };
/** GM Core: trained and up lose the level, untrained goes from +0 to -2. */
const LEVEL = 1;
const UNTRAINED_WITHOUT_LEVEL = -2;

function readsProficiency({ formula }: Term): boolean {
  return formula.startsWith('@prof.') || formula === '@weapon.prof';
}

/** A proficiency term's value under the variant. */
function profWithoutLevel(term: Term): Term {
  return { ...term, value: term.value === UNTRAINED ? UNTRAINED_WITHOUT_LEVEL : term.value - LEVEL };
}

const sumOf = (terms: readonly Term[]): number => terms.reduce((sum, { value }) => sum + value, 0);

/** A golden breakdown under the variant: its proficiency term moved, the total by as much, nothing else. */
function goldenWithoutLevel(golden: Breakdown): Breakdown {
  const base = golden.base.map((term) => (readsProficiency(term) ? profWithoutLevel(term) : term));
  return { ...golden, total: golden.total + sumOf(base) - sumOf(golden.base), base };
}

/** Each statistic's base terms' origin hops. */
function termHops(derived: ReadonlyMap<Selector, StatisticResult>): Record<string, readonly unknown[]> {
  return Object.fromEntries(
    [...derived].map(([selector, result]) => [selector, termsOf(valueOf(result)).map(({ origin }) => origin?.hops)]),
  );
}

/** The variant's hop on a proficiency term, no origin on any other. */
function variantHops(golden: Breakdown): readonly unknown[] {
  return golden.base.map((term) => (readsProficiency(term) ? [VARIANT_HOP] : undefined));
}

function derive(rules: readonly RuleInPlay[], options?: readonly string[]): ReadonlyMap<Selector, StatisticResult> {
  return deriveStatistics(core, goldenFighter(), { rules: [...gear, ...rules], facts: fighterFacts(options) });
}

describe('golden level 1 Fighter', () => {
  test('derives every core statistic and its Strike with the breakdown Player Core gives', () => {
    const derived = derive([]);
    const expected = [...SELECTORS, 'strike:longsword'].map((selector) => Selector.parse(selector));
    expect([...derived.keys()].toSorted()).toStrictEqual(expected.toSorted());
    expect(breakdowns(derived)).toStrictEqual(GOLDEN);
  });

  test('without its armor Strength met, the Speed penalty applies and the check penalty is conditional', () => {
    const derived = breakdowns(derive([], []));
    const reached = Object.keys(PENALISED);
    expect(
      Object.fromEntries(reached.map((selector) => [selector, derived[selector]?.lines.map(({ status }) => status)])),
    ).toStrictEqual(PENALISED);
    expect(derived['speed:land']?.total).toBe(20);
  });

  test('with Raise a Shield in effect, the steel shield adds its +2 circumstance bonus to AC', () => {
    const { ac } = breakdowns(derive([], [STRENGTH_MET, SHIELD_RAISED]));
    expect(ac?.total).toBe(20);
    expect(ac?.lines.map(({ status }) => status)).toStrictEqual([LineStatusKind.Applied, LineStatusKind.Applied]);
  });

  test('Proficiency Without Level moves exactly the proficiency terms, each naming the variant', () => {
    const derived = derive(withoutLevel());
    const golden = Object.entries(GOLDEN);
    expect(breakdowns(derived)).toStrictEqual(
      Object.fromEntries(golden.map(([selector, breakdown]) => [selector, goldenWithoutLevel(breakdown)])),
    );
    expect(termHops(derived)).toStrictEqual(
      Object.fromEntries(golden.map(([selector, breakdown]) => [selector, variantHops(breakdown)])),
    );
  });
});
