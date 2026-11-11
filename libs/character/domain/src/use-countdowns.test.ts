import { describe, expect, test } from 'bun:test';

import { RandomSeed, seededRandom } from '@pioneer/rules/dice/testing';
import { ContentId, HitPoints } from '@pioneer/rules/sdk';
import { assert, integer, property } from 'fast-check';

import { abilityUseKey, Boundary, UseCountdown } from './counted-resources';
import type { CountedMaxima, CountedMaximum, UseCountKey } from './counted-resources';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayCommand, PlayLimits, PlayState } from './play-state';
import { ResourceCount } from './resource-count';
import { actions, OWN_TURN, playIn, Serial, spendOf } from './spend-log-testing';
import { within } from './testing';
import { startTurn } from './turn-start';
import { roundsLeft } from './use-countdowns';

const TURNLY = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-0000000000c1'));
const HOURLY = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-0000000000c2'));
const DAILY = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-0000000000c3'));
const WEEKLY = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-0000000000c4'));
const ONE = ResourceCount.parse(1);
const TWO = ResourceCount.parse(2);
const HOUR = UseCountdown.parse(600);
const MINUTE = UseCountdown.parse(10);
const SEED = RandomSeed.parse(3);
const TURNS_MAX = 40;

const MAXIMA: ReadonlyMap<UseCountKey, CountedMaximum> = new Map([
  [TURNLY, { max: ONE, boundary: Boundary.Turn }],
  [HOURLY, { max: TWO, boundary: Boundary.Rest, countdown: HOUR }],
  [DAILY, { max: ONE, boundary: Boundary.Day }],
  [WEEKLY, { max: ONE, boundary: Boundary.Manual }],
]);
const COUNTED: CountedMaxima = { slots: new Map(), uses: MAXIMA };
const LIMITS: PlayLimits = { ...within(HitPoints.parse(10)), counted: COUNTED };

function apply(play: PlayState, command: PlayCommand): PlayState {
  return applyPlayCommand(play, command, LIMITS);
}

function spend(play: PlayState, use: UseCountKey): PlayState {
  return apply(play, { field: PlayCommandField.SpendUse, use });
}

/** How many uses of `use` are spent. */
function spentOf(play: PlayState, use: UseCountKey): number {
  return Number(play.resources.uses[use] ?? 0);
}

function nextTurn(play: PlayState): PlayState {
  return startTurn(play, { limits: LIMITS, recovery: [] }, seededRandom(SEED)).play;
}

function turns(play: PlayState, count: number): PlayState {
  let current = play;
  for (let each = 0; each < count; each += 1) {
    current = nextTurn(current);
  }
  return current;
}

describe('a frequency of a turn', () => {
  test('comes back at Start turn', () => {
    const spent = spend(FRESH_PLAY, TURNLY);

    expect(spentOf(spent, TURNLY)).toBe(Number(ONE));
    expect(spentOf(nextTurn(spent), TURNLY)).toBe(0);
  });
});

describe('a frequency of an hour', () => {
  test('starts a countdown of 600 rounds with its first use, and a later use leaves it running', () => {
    const once = spend(FRESH_PLAY, HOURLY);
    const later = spend(turns(once, 5), HOURLY);

    expect(roundsLeft(once.resources, HOURLY)).toBe(HOUR);
    expect(roundsLeft(later.resources, HOURLY)).toBe(UseCountdown.parse(595));
  });

  test('counts down a round at each Start turn and gives its uses back at 0', () => {
    const once = spend(spend(FRESH_PLAY, HOURLY), HOURLY);

    expect(spentOf(turns(once, 599), HOURLY)).toBe(Number(TWO));
    expect(roundsLeft(turns(once, 599).resources, HOURLY)).toBe(UseCountdown.parse(1));
    expect(spentOf(turns(once, 600), HOURLY)).toBe(0);
    expect(roundsLeft(turns(once, 600).resources, HOURLY)).toBeUndefined();
  });

  test('is given back by a rest', () => {
    const rested = apply(spend(FRESH_PLAY, HOURLY), { field: PlayCommandField.Rest });

    expect(spentOf(rested, HOURLY)).toBe(0);
    expect(roundsLeft(rested.resources, HOURLY)).toBeUndefined();
  });

  test('is cleared with its countdown when the use is refunded', () => {
    const refunded = apply(spend(FRESH_PLAY, HOURLY), { field: PlayCommandField.RefundUse, use: HOURLY });

    expect(roundsLeft(refunded.resources, HOURLY)).toBeUndefined();
  });

  test('keeps its countdown when one of two uses is refunded', () => {
    const refunded = apply(spend(spend(FRESH_PLAY, HOURLY), HOURLY), {
      field: PlayCommandField.RefundUse,
      use: HOURLY,
    });

    expect(roundsLeft(refunded.resources, HOURLY)).toBe(HOUR);
  });

  test('undoing the spend that logged the use clears the countdown it started', () => {
    const FIRST = Serial.parse(1);
    const logged = apply(playIn(OWN_TURN), { ...spendOf(FIRST, actions(1)), use: HOURLY });
    const undone = apply(logged, { field: PlayCommandField.UndoSpend, id: spendOf(FIRST, actions(1)).id });

    expect(roundsLeft(logged.resources, HOURLY)).toBe(HOUR);
    expect(roundsLeft(undone.resources, HOURLY)).toBeUndefined();
  });
});

describe('a frequency of a day', () => {
  test('comes back at daily preparations and not at Start turn or Rest', () => {
    const spent = spend(FRESH_PLAY, DAILY);

    expect(spentOf(nextTurn(spent), DAILY)).toBe(Number(ONE));
    expect(spentOf(apply(spent, { field: PlayCommandField.Rest }), DAILY)).toBe(Number(ONE));
    expect(spentOf(apply(spent, { field: PlayCommandField.DailyPreparations }), DAILY)).toBe(0);
  });
});

describe('a frequency of a week', () => {
  test('comes back only when reset by hand', () => {
    const spent = spend(FRESH_PLAY, WEEKLY);

    const rested = apply(turns(spent, 1000), { field: PlayCommandField.Rest });
    const reset = apply(spent, { field: PlayCommandField.ResetUse, use: WEEKLY });

    expect(spentOf(rested, WEEKLY)).toBe(Number(ONE));
    expect(spentOf(reset, WEEKLY)).toBe(0);
  });

  test('a reset of a use the character does not have changes nothing', () => {
    const unknown = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-0000000000c9'));

    expect(apply(FRESH_PLAY, { field: PlayCommandField.ResetUse, use: unknown })).toStrictEqual(FRESH_PLAY);
  });

  test('a reset gives back the uses and the countdown of an hourly use too', () => {
    const reset = apply(spend(FRESH_PLAY, HOURLY), { field: PlayCommandField.ResetUse, use: HOURLY });

    expect(spentOf(reset, HOURLY)).toBe(0);
    expect(roundsLeft(reset.resources, HOURLY)).toBeUndefined();
  });
});

describe('a countdown', () => {
  test('goes down one round per Start turn and holds the spent use while it runs', () => {
    assert(
      property(integer({ min: 0, max: TURNS_MAX }), (count) => {
        const after = turns(spend(FRESH_PLAY, HOURLY), count);
        const left = Number(roundsLeft(after.resources, HOURLY));

        expect(left).toBe(Number(HOUR) - count);
        expect(spentOf(after, HOURLY)).toBe(1);
      }),
    );
  });

  test('a minute is ten rounds', () => {
    expect(Number(MINUTE)).toBe(10);
  });
});
