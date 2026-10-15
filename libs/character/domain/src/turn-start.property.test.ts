import { describe, test } from 'bun:test';

import { RandomSeed, seededRandom } from '@pioneer/rules/dice/testing';
import { ContentId, EffectExpiry, HitPoints } from '@pioneer/rules/sdk';
import { array, assert, constantFrom, integer, option, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { EffectInstanceId, EffectRounds, SELF } from './effects';
import type { ActiveEffect } from './effects';
import { FRESH_PLAY } from './play-state';
import { within } from './testing';
import { TurnEventKind } from './turn-events';
import { startTurn } from './turn-start';

const ROUNDS_MAX = 20;
const EFFECTS_MAX = 12;
const RUNS = 200;
const SEED_MAX = 1000;
const ID_DIGITS = 12;
const CONTENT = ContentId.parse('00000000-0000-4000-8000-0000000000a1');
const LIMITS = within(HitPoints.parse(10));

const rounds: Arbitrary<number | undefined> = option(integer({ min: 1, max: ROUNDS_MAX }), { nil: undefined });
const expiries: Arbitrary<EffectExpiry | undefined> = option(constantFrom(...Object.values(EffectExpiry)), {
  nil: undefined,
});
const shapes = array(record({ remaining: rounds, expiry: expiries }), { maxLength: EFFECTS_MAX });

function instanceId(index: number): EffectInstanceId {
  return EffectInstanceId.parse(`00000000-0000-4000-8000-${String(index).padStart(ID_DIGITS, '0')}`);
}

const effects: Arbitrary<readonly ActiveEffect[]> = shapes.map((each) =>
  each.map(({ remaining, expiry }, index): ActiveEffect => ({
    id: instanceId(index),
    effect: CONTENT,
    source: SELF,
    ...(remaining === undefined ? {} : { remaining: EffectRounds.parse(remaining) }),
    ...(expiry === undefined ? {} : { expiry }),
  })),
);

/** Whether the effect ends at this turn start: its last round ends at a turn start, or it has no clock and ends at one. */
function ranOut({ remaining, expiry }: ActiveEffect): boolean {
  if (remaining === undefined) {
    return expiry === EffectExpiry.TurnStart;
  }
  return remaining === 1 && (expiry ?? EffectExpiry.TurnStart) === EffectExpiry.TurnStart;
}

describe('startTurn properties', () => {
  test('no duration goes below 1 round, and only effects that ran out at a turn start are removed', () => {
    assert(
      property(effects, integer({ min: 0, max: SEED_MAX }), (before, seed) => {
        const random = seededRandom(RandomSeed.parse(seed));
        const { play, events } = startTurn(
          { ...FRESH_PLAY, effects: before },
          { limits: LIMITS, recovery: [] },
          random,
        );
        const removed = before.filter(({ id }) => !play.effects.some((each) => each.id === id));
        const expired = events.filter(({ kind }) => kind === TurnEventKind.EffectExpired);
        const floored = play.effects.every(({ remaining }) => remaining === undefined || remaining >= 1);
        const onlyRanOut = removed.every((each) => ranOut(each));
        const allRanOut = before.filter((each) => ranOut(each)).length === removed.length;
        return floored && onlyRanOut && allRanOut && expired.length === removed.length;
      }),
      { numRuns: RUNS },
    );
  });
});
