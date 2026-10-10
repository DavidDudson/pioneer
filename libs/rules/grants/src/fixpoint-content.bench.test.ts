import { expect, test } from 'bun:test';

import type { SlotKey } from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantInputs } from './resolve-grants';
import { entry, feat, idOf, inputsOf, picked, picksOf, slotOf } from './testing/builders';
import { FIGHTER_CONTENT, LEVEL_20_PICKS } from './testing/fighter';

const FILLER_FEATS = 1000;
const LEVEL_MAX = 20;
const TRAITS: readonly string[] = ['fighter', 'rogue', 'wizard', 'general', 'skill', 'human'];
const WARMUP_RUNS = 20;
const TIMED_RUNS = 51;
/** The issue's budget for a level 20 character over real content, within the 10 ms budget for a derivation. */
const BUDGET_MS = 3;

/** Feats spread over the traits and levels, as an installed core pack has them. */
function fillerFeats(): GrantEntry[] {
  return Array.from({ length: FILLER_FEATS }, (_value, index) =>
    feat(`filler-${index}`, [
      `trait:${TRAITS[Math.floor(index / LEVEL_MAX) % TRAITS.length] ?? 'general'}`,
      `level:${(index % LEVEL_MAX) + 1}`,
    ]),
  );
}

/** Levels each of the ancestry's slot kinds arrives at, by the trait its feats carry. */
const SLOT_LEVELS: Readonly<Record<string, readonly number[]>> = {
  human: [1, 5, 9, 13, 17],
  general: [3, 7, 11, 15, 19],
  skill: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
};

/** Every slot the ancestry adds: its trait and the level it arrives at, in rule order. */
const SLOTS: readonly (readonly [string, number])[] = Object.entries(SLOT_LEVELS).flatMap(([trait, levels]) =>
  levels.map((level): readonly [string, number] => [trait, level]),
);
const RULES_PER_SLOT = 2;

/** A feat slot for `trait` at `level`: a feat with the trait of the character's level or lower, granted once picked. */
function slotRules([trait, level]: readonly [string, number]): readonly object[] {
  const flag = `${trait}-feat-${level}`;
  return [
    {
      key: 'ChoiceSet',
      flag,
      predicate: [{ gte: ['self:level', level] }],
      choices: { kind: 'feat', filter: [`item:trait:${trait}`, { lte: ['item:level', 'self:level'] }] },
    },
    { key: 'GrantItem', item: { choice: flag } },
  ];
}

/** An ancestry holding the ancestry, general and skill feat slots, so the character has about 30. */
const ancestry: GrantEntry = entry(
  'human',
  SLOTS.flatMap((slot) => slotRules(slot)),
);

/** A filler feat for each ancestry slot: the one with its trait at its level. */
const ANCESTRY_PICKS: readonly (readonly [SlotKey, string])[] = SLOTS.map(([trait, level], at) => {
  const filler = TRAITS.indexOf(trait) * LEVEL_MAX + level - 1;
  return [slotOf('human', at * RULES_PER_SLOT), idOf(`filler-${filler}`)];
});

/** The golden Fighter at 20th level, with a human ancestry, every slot picked, over a thousand more feats. */
function inputs(): GrantInputs {
  return inputsOf({
    entries: [...FIGHTER_CONTENT, ancestry, ...fillerFeats()],
    roots: [picked('fighter', 'class'), picked('human', 'ancestry')],
    level: LEVEL_MAX,
    picks: picksOf([...LEVEL_20_PICKS, ...ANCESTRY_PICKS]),
  });
}

/**
 * The fastest of `times`, in milliseconds. Other work on the machine (CI runs projects in parallel) only ever adds
 * time, so the fastest run is the closest to what resolution itself costs.
 */
function fastestOf(times: readonly number[]): number {
  return Math.min(...times);
}

test(`a level 20 character with every slot picked over ${FILLER_FEATS} more feats resolves in under ${BUDGET_MS} ms`, () => {
  for (let run = 0; run < WARMUP_RUNS; run += 1) {
    resolveGrants(inputs());
  }
  const times = Array.from({ length: TIMED_RUNS }, (): number => {
    const given = inputs();
    const start = performance.now();
    resolveGrants(given);
    return performance.now() - start;
  });
  const result = resolveGrants(inputs());
  expect(result.open).toEqual([]);
  expect(result.answered).toHaveLength(LEVEL_20_PICKS.length + ANCESTRY_PICKS.length);
  expect(fastestOf(times)).toBeLessThan(BUDGET_MS);
});
