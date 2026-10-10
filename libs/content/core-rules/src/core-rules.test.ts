import { describe, expect, test } from 'bun:test';

import { deriveStatistics, RuleInPlay, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticInputs, StatisticResult } from '@pioneer/rules/engine';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { contentId, ContentRegistry, Proficiency, Selector, Slug } from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { coreRules } from './index';

const ATTRIBUTE_MIN = -5;
const ATTRIBUTE_MAX = 7;
const LEVEL_MAX = 20;
const AC_BASE = 10;
/** Proficiency bonus before level, per rank (Player Core). */
const RANK_BONUS: Readonly<Record<Proficiency, number>> = {
  [Proficiency.Untrained]: 0,
  [Proficiency.Trained]: 2,
  [Proficiency.Expert]: 4,
  [Proficiency.Master]: 6,
  [Proficiency.Legendary]: 8,
};
/** How many times the level adds to the proficiency bonus: none when untrained. */
const LEVEL_TIMES: Readonly<Record<Proficiency, number>> = {
  [Proficiency.Untrained]: 0,
  [Proficiency.Trained]: 1,
  [Proficiency.Expert]: 1,
  [Proficiency.Master]: 1,
  [Proficiency.Legendary]: 1,
};

/** A level 3 fighter in a breastplate (Dexterity cap +1). */
const fighter: StatisticInputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 4, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
  ranks: {
    ac: 'trained',
    'save:fortitude': 'expert',
    'save:reflex': 'expert',
    'save:will': 'trained',
    perception: 'expert',
  },
  dexterityCap: 1,
});

const SELECTORS = ['ac', 'save:fortitude', 'save:reflex', 'save:will', 'perception'];

function totals(results: ReadonlyMap<Selector, StatisticResult>): Record<string, number | undefined> {
  return Object.fromEntries(
    [...results].map(([selector, result]) => [selector, result.ok ? result.total : undefined]),
  );
}

/** A +1 status bonus to everything in `target`, as a rule on a test entry. */
function bonusTo(target: string): RuleInPlay {
  return RuleInPlay.parse({
    element: { key: 'FlatModifier', type: 'status', value: 1, selectors: [target] },
    origin: {
      hops: [],
      entry: contentId(coreRules.id, Slug.parse('test-bonus')),
      sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    },
    rule: 0,
  });
}

/** Which statistics a +1 to `target` raises. */
function reachedBy(target: string): readonly string[] {
  const without = totals(deriveStatistics(coreRules.statistics, fighter));
  const facts = new PredicateFacts([]);
  const withBonus = totals(deriveStatistics(coreRules.statistics, fighter, { rules: [bonusTo(target)], facts }));
  return SELECTORS.filter((selector) => withBonus[selector] !== without[selector]);
}

const proficiency: Arbitrary<Proficiency> = constantFrom(...Object.values(Proficiency));
const attribute: Arbitrary<number> = integer({ min: ATTRIBUTE_MIN, max: ATTRIBUTE_MAX });

/** Generated inputs as JSON, with the values AC reads kept beside them. */
interface GeneratedInputs {
  readonly json: object;
  readonly ac: Proficiency;
  readonly dex: number;
  readonly cap: number;
  readonly level: number;
}

/** Inputs with every attribute, every core rank and the Dexterity cap generated. */
const anyInputs: Arbitrary<GeneratedInputs> = record({
    level: integer({ min: 1, max: LEVEL_MAX }),
    str: attribute,
    dex: attribute,
    con: attribute,
    int: attribute,
    wis: attribute,
    cha: attribute,
    cap: attribute,
    ac: proficiency,
    fortitude: proficiency,
    reflex: proficiency,
    will: proficiency,
    perception: proficiency,
  }).map(({ level, str, dex, con, int, wis, cha, cap, ac, fortitude, reflex, will, perception }) => ({
    json: {
      level,
      attributes: { str, dex, con, int, wis, cha },
      ranks: { ac, 'save:fortitude': fortitude, 'save:reflex': reflex, 'save:will': will, perception },
      dexterityCap: cap,
    },
    ac,
    dex,
    cap,
    level,
  }));

describe('core rules pack', () => {
  test('registers with no duplicate selectors', () => {
    const registry = new ContentRegistry();
    registry.register(coreRules);
    for (const selector of SELECTORS) {
      expect(registry.statisticsFor(Selector.parse(selector))).toHaveLength(1);
    }
    expect(registry.statistics()).toHaveLength(SELECTORS.length);
  });

  test('derives AC, the saves and Perception for a level 3 fighter', () => {
    expect(totals(deriveStatistics(coreRules.statistics, fighter))).toStrictEqual({
      ac: 16,
      'save:fortitude': 9,
      'save:reflex': 9,
      'save:will': 6,
      perception: 8,
    });
  });

  test('domains route modifiers to the right statistics', () => {
    expect(reachedBy('saving-throw')).toStrictEqual(['save:fortitude', 'save:reflex', 'save:will']);
    expect(reachedBy('check')).toStrictEqual(['save:fortitude', 'save:reflex', 'save:will', 'perception']);
    expect(reachedBy('dex-based')).toStrictEqual(['ac', 'save:reflex']);
    expect(reachedBy('wis-based')).toStrictEqual(['save:will', 'perception']);
    expect(reachedBy('all')).toStrictEqual(SELECTORS);
  });

  test('every statistic derives for any attributes and ranks, and AC follows its formula', () => {
    assert(
      property(anyInputs, ({ json, ac, dex, cap, level }) => {
        const results = deriveStatistics(coreRules.statistics, StatisticInputsJson.parse(json));
        const derived = totals(results);
        expect(Object.values(derived).every((total) => total !== undefined)).toBe(true);
        const prof = RANK_BONUS[ac] + LEVEL_TIMES[ac] * level;
        expect(derived['ac']).toBe(AC_BASE + Math.min(dex, cap) + prof);
      }),
    );
  });
});
