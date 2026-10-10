import { describe, expect, test } from 'bun:test';

import { StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { assert, constant, integer, oneof, property, shuffledSubarray, subarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { BaseTermKind } from './base-term';
import { deriveStatistics } from './derive-statistics';
import { EngineMessage } from './messages';
import { StatisticInputsJson } from './statistic-inputs';

const STATISTICS_MAX = 8;
const CONSTANT_MAX = 20;

const inputs = StatisticInputsJson.parse({
  level: 5,
  attributes: { str: 3, dex: 2, con: 1, int: 0, wis: -1, cha: 4 },
  ranks: { ac: 'expert', 'stat-0': 'trained' },
  dexterityCap: 1,
});

/** Input references that always have a value. */
const INPUT_TERMS = ['@level', '@attr.str', '@attr.dex.capped', '@prof.ac', '@rank.stat-0', '@prof.unlisted'];

const selectorOf = (index: number): string => `stat-${index}`;

function definition(index: number, terms: readonly string[]): StatisticDefinition {
  const selector = selectorOf(index);
  return StatisticDefinition.parse({
    slug: selector,
    name: selector,
    selector,
    domains: [],
    base: terms.join(' + '),
    kind: StatisticKind.Check,
  });
}

/** One statistic's terms: a constant, some input references, and references to the statistics in `reads`. */
function termsReading(reads: readonly number[]): Arbitrary<string[]> {
  const statistics = reads.map((index) => `@stat.${selectorOf(index)}`);
  const terms = ([value, read]: [number, string[]]): string[] => [String(value), ...read, ...statistics];
  return tuple(integer({ min: 0, max: CONSTANT_MAX }), subarray(INPUT_TERMS)).map((drawn) => terms(drawn));
}

/** 0 to `count - 1`. */
const indexes = (count: number): number[] => Array.from({ length: count }, (_value, index) => index);

/** Statistic `index`, reading some of the statistics before it. */
const statisticAt = (index: number): Arbitrary<StatisticDefinition> =>
  subarray(indexes(index)).chain((reads) => termsReading(reads).map((terms) => definition(index, terms)));

/** Statistics where each reads only statistics before it, so the graph has no cycle. */
const acyclic: Arbitrary<StatisticDefinition[]> = integer({ min: 1, max: STATISTICS_MAX }).chain((count) =>
  tuple(...indexes(count).map((index) => statisticAt(index))),
);

interface WithCycle {
  readonly definitions: StatisticDefinition[];
  readonly cycle: readonly string[];
}

/** The definitions with each statistic in `onCycle` also reading the next one, and the last reading the first. */
function closeCycle(definitions: readonly StatisticDefinition[], onCycle: readonly number[]): WithCycle {
  const next = new Map(onCycle.map((index, at) => [index, onCycle[(at + 1) % onCycle.length] ?? index]));
  return {
    definitions: definitions.map((existing, index) => {
      const target = next.get(index);
      return target === undefined
        ? existing
        : StatisticDefinition.parse({ ...existing, base: `${existing.base} + @stat.${selectorOf(target)}` });
    }),
    cycle: onCycle.map((index) => selectorOf(index)),
  };
}

/**
 * An acyclic graph, then a cycle through some of its statistics. Edges may now run either way, so other statistics
 * may join the cycle.
 */
const withCycle: Arbitrary<WithCycle> = acyclic.chain((definitions) =>
  shuffledSubarray(indexes(definitions.length), { minLength: 1 }).map((onCycle) => closeCycle(definitions, onCycle)),
);

/** Any graph, with and without cycles. */
const anyGraph: Arbitrary<StatisticDefinition[]> = oneof(
  acyclic,
  withCycle.map(({ definitions }) => definitions),
);

/** A graph and the same definitions in another order. */
const reordered: Arbitrary<[StatisticDefinition[], StatisticDefinition[]]> = anyGraph.chain((definitions) =>
  tuple(
    constant(definitions),
    shuffledSubarray(definitions, { minLength: definitions.length, maxLength: definitions.length }),
  ),
);

describe('statistic graph (properties)', () => {
  test('results do not depend on the order the definitions are given in', () => {
    assert(
      property(reordered, ([definitions, shuffled]) => {
        expect([
          ...deriveStatistics({ definitions: shuffled, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs),
        ]).toStrictEqual([
          ...deriveStatistics({ definitions, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs),
        ]);
      }),
    );
  });

  test('acyclic graphs never error, and the base terms add up to the total', () => {
    assert(
      property(acyclic, (definitions) => {
        const results = [
          ...deriveStatistics({ definitions, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs).values(),
        ];
        expect(results).toHaveLength(definitions.length);
        for (const result of results) {
          expect(result.ok).toBe(true);
          const sum = result.ok ? result.base.reduce((total, term) => total + term.value, 0) : undefined;
          expect(sum).toBe(result.ok ? result.total : undefined);
          expect(result.ok && result.base.every((term) => term.kind === BaseTermKind.Term)).toBe(true);
        }
      }),
    );
  });

  test('every statistic on a generated cycle reports the cycle, naming each statistic on it', () => {
    assert(
      property(withCycle, ({ definitions, cycle }) => {
        const results = deriveStatistics({ definitions, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs);
        for (const selector of cycle) {
          const result = [...results.values()].find((found) => found.selector === selector);
          expect(result?.ok).toBe(false);
          const error = result?.ok === false ? result.error : undefined;
          expect(error?.key).toBe(EngineMessage.StatisticCycle);
          const named = String(error?.params?.['statistics']).split(', ');
          for (const member of cycle) {
            expect(named).toContain(member);
          }
        }
      }),
    );
  });
});
