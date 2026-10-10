import { expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';
import { walkGrants } from './grant-walk';
import type { WalkInputs } from './grant-walk';
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
function inputs(): WalkInputs {
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

/**
 * The fastest of `times`, in milliseconds. Other work on the machine (CI runs projects in parallel) only ever adds
 * time, so the fastest run is the closest to what resolution itself costs.
 */
function fastestOf(times: readonly number[]): number {
  return Math.min(...times);
}

// One walk: the query runs once per round, and the fixpoint bench times a whole character.
test(`a query over ${ENTRIES} entries resolves in under ${BUDGET_MS} ms`, () => {
  for (let run = 0; run < WARMUP_RUNS; run += 1) {
    walkGrants(inputs());
  }
  // Fresh entries each run, as a caller building content per request has them; only resolution is timed.
  const times = Array.from({ length: TIMED_RUNS }, (): number => {
    const given = inputs();
    const start = performance.now();
    walkGrants(given);
    return performance.now() - start;
  });
  const fastest = fastestOf(times);
  expect(walkGrants(inputs()).open[0]?.options.length).toBeGreaterThan(0);
  expect(fastest).toBeLessThan(BUDGET_MS);
});
