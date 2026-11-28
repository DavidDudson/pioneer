import { describe, expect, test } from 'bun:test';

import { alterItem, deriveStatistics, StatisticInputsJson, variantRulesInPlay } from '@pioneer/rules/engine';
import type { ItemNumbers, RuleInPlay, StatisticInputs, StatisticResult } from '@pioneer/rules/engine';
import { wielded } from '@pioneer/rules/engine/testing';
import { FormulaValue } from '@pioneer/rules/formula';
import { PredicateFacts } from '@pioneer/rules/predicate';
import type { Origin } from '@pioneer/rules/sdk';
import {
  ContentId,
  contentId,
  ContentRegistry,
  EntrySlug,
  ModifierType,
  NumericItemProperty,
  OriginHopKind,
  RollOption,
  RollOptionTail,
  Selector,
  VariantRuleId,
} from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { core, coreRules } from './testing/core-rules';

const LEVEL_MAX = 20;

/** GM Core's Automatic Bonus Progression table: the level each potency bonus starts at, +1 first. */
const POTENCY_LEVELS = {
  'strike:longsword': [2, 10, 16],
  ac: [5, 11, 18],
  perception: [7, 13, 19],
  'save:fortitude': [8, 14, 20],
  'save:reflex': [8, 14, 20],
  'save:will': [8, 14, 20],
} as const;

/** GM Core's devastating attacks: the level each extra weapon die starts at. */
const STRIKING_LEVELS: readonly [number, number, number] = [4, 12, 19];

const VARIANT = VariantRuleId.parse(
  contentId(coreRules.id, EntrySlug.parse('variant-rule:automatic-bonus-progression')),
);

/** The rule elements of Automatic Bonus Progression, in play as an enabled variant. */
function automaticBonus(): ReadonlyArray<RuleInPlay> {
  const registry = new ContentRegistry();
  registry.register(coreRules);
  const variant = registry.variantRule(VARIANT);

  if (variant === undefined) {
    throw new Error('The core pack has no Automatic Bonus Progression');
  }

  return variantRulesInPlay([variant]);
}

const RULES = automaticBonus();

/** What the table gives at `level`, for a bonus that starts at `levels`. */
function bonusAt(level: number, levels: ReadonlyArray<number>): number {
  return levels.filter((start) => level >= start).length;
}

/** A character of `level` with every attribute and rank at 0 or untrained, wielding a longsword with no rune. */
function character(level: number): StatisticInputs {
  return StatisticInputsJson.parse({
    level,
    attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: {},
    dexterityCap: 0,
    ancestry: { hitPoints: 8, speed: 25 },
    class: { hitPoints: 10, keyAttribute: 'str' },
    weapons: [wielded({ slug: 'longsword', category: 'martial', traits: [] })],
  });
}

function factsAt(level: number): PredicateFacts {
  return new PredicateFacts([RollOption.parse(`self:level:${level}`)], CORE_NAMESPACES);
}

/** The total of `selector`; not a number when the statistic failed. */
function totalOf(results: ReadonlyMap<Selector, StatisticResult>, selector: string): number {
  const result = results.get(Selector.parse(selector));

  return result?.ok === true ? result.total : Number.NaN;
}

/** How far the variant moved `selector`'s total at `level`. */
function shiftAt(level: number, selector: string): number {
  const without = deriveStatistics(core, character(level), { rules: [], facts: factsAt(level) });
  const variant = deriveStatistics(core, character(level), { rules: RULES, facts: factsAt(level) });

  return totalOf(variant, selector) - totalOf(without, selector);
}

/** A potency line that applies, and where it comes from. */
interface PotencyLine {
  readonly origin: Origin;
}

/** The potency lines that apply to AC at `level`. */
function appliedAcPotency(level: number): ReadonlyArray<PotencyLine> {
  const ac = deriveStatistics(core, character(level), { rules: RULES, facts: factsAt(level) }).get(
    Selector.parse('ac'),
  );

  const lines = ac?.ok === true ? ac.lines : [];

  return lines
    .filter(({ modifier, status }) => modifier.type === ModifierType.Potency && status.kind === 'applied')
    .map(({ modifier }) => ({ origin: modifier.origin }));
}

const LEVELS = Array.from(Array.from({ length: LEVEL_MAX }).keys(), (index) => index + 1);

describe('Automatic Bonus Progression potency bonuses, levels 1 to 20', () => {
  test.each(LEVELS)('level %i adds the GM Core potency to attacks, AC, Perception and saves', (level) => {
    for (const [selector, levels] of Object.entries(POTENCY_LEVELS)) {
      expect({ selector, shift: shiftAt(level, selector) }).toStrictEqual({ selector, shift: bonusAt(level, levels) });
    }
  });

  test('a potency line names the variant as its origin', () => {
    const [line] = appliedAcPotency(5);

    expect(appliedAcPotency(5)).toHaveLength(1);
    expect(line?.origin.hops).toStrictEqual([{ kind: OriginHopKind.Variant, rule: ContentId.parse(VARIANT) }]);
  });
});

/** An item's numbers: each property with the grade or bonus it has. */
function held(...pairs: ReadonlyArray<readonly [NumericItemProperty, number]>): ItemNumbers {
  return new Map(pairs.map(([property, grade]) => [property, FormulaValue.parse(grade)]));
}

/** The numbers a weapon or armour of `type` has, altered by the variant at `level`. */
function altered(
  type: 'weapon' | 'armor',
  level: number,
  numbers: ItemNumbers,
): ReadonlyMap<NumericItemProperty, number> {
  const rollOptions = [`type:${type}`, 'equipped'].map((option) => RollOptionTail.parse(option));

  return alterItem(
    { rules: RULES, facts: factsAt(level) },
    { rollOptions, numbers, traits: [], damageType: undefined, materials: [], propertyRunes: [] },
  ).numbers;
}

const { Potency, Resilient, Striking, AcBonus } = NumericItemProperty;

describe('Automatic Bonus Progression and item runes', () => {
  test.each(LEVELS)('level %i: potency runes stop counting on weapons and armour', (level) => {
    expect(altered('weapon', level, held([Potency, 3])).get(Potency)).toBe(0);
    expect(altered('armor', level, held([Potency, 3])).get(Potency)).toBe(0);
  });

  test('resilient runes stop counting on armour', () => {
    expect(altered('armor', 9, held([Resilient, 2])).get(Resilient)).toBe(0);
  });

  test.each(LEVELS)('level %i: a weapon rolls the devastating attack dice of its level, whatever its rune', (level) => {
    const expected = bonusAt(level, STRIKING_LEVELS);

    expect(altered('weapon', level, held()).get(Striking)).toBe(expected);
    expect(altered('weapon', level, held([Striking, 3])).get(Striking)).toBe(expected);
  });

  test("armour's own item bonus is left alone", () => {
    expect(altered('armor', 5, held([AcBonus, 2], [Potency, 1])).get(AcBonus)).toBe(2);
  });
});
