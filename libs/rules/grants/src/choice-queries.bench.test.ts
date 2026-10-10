import { expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantInputs } from './resolve-grants';
import { entry, feat, lookupOf, picked, picksOf } from './testing/builders';

const ENTRIES = 1000;
const LEVELS = 20;
const CLASSES = ['fighter', 'rogue', 'wizard', 'cleric', 'ranger'] as const;
const WARMUP_RUNS = 20;
const TIMED_RUNS = 51;
/** The issue's budget for one query over a thousand entries. */
const BUDGET_MS = 2;

/** Feats spread over the classes and levels, each with a class trait, a level and two more traits. */
function feats(): GrantEntry[] {
  return Array.from({ length: ENTRIES }, (_value, index) =>
    feat(`feat-${index}`, [
      `trait:${CLASSES[index % CLASSES.length] ?? 'fighter'}`,
      `level:${(index % LEVELS) + 1}`,
      'trait:general',
      `trait:tag-${index % 7}`,
    ]),
  );
}

/** A 5th-level fighter with some facts, asking for a fighter feat of their level or lower. */
function inputs(): GrantInputs {
  const fighter = entry('fighter', [
    {
      key: 'ChoiceSet',
      flag: 'class-feat',
      choices: { kind: 'feat', filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
    },
  ]);
  const options = [
    'self:level:5',
    'class:fighter',
    ...Array.from({ length: 40 }, (_value, index) => `feat:f-${index}`),
  ];
  return {
    roots: [picked('fighter')],
    lookup: lookupOf([fighter, ...feats()]),
    facts: new PredicateFacts(options.map((option) => RollOption.parse(option))),
    picks: picksOf(),
  };
}

/** The middle of `times`, in milliseconds. */
function medianOf(times: readonly number[]): number {
  const sorted = times.toSorted((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.POSITIVE_INFINITY;
}

test(`a query over ${ENTRIES} entries resolves in under ${BUDGET_MS} ms`, () => {
  const given = inputs();
  for (let run = 0; run < WARMUP_RUNS; run += 1) {
    resolveGrants(given);
  }
  const times = Array.from({ length: TIMED_RUNS }, (): number => {
    const start = performance.now();
    resolveGrants(given);
    return performance.now() - start;
  });
  const median = medianOf(times);
  expect(resolveGrants(given).open[0]?.options.length).toBeGreaterThan(0);
  expect(median).toBeLessThan(BUDGET_MS);
});
