import { describe, expect, test } from 'bun:test';

import { HitPoints } from '@pioneer/rules/sdk';
import { array, assert, boolean, constantFrom, pre, property, record } from 'fast-check';

import { applyPlayCommand, PlayCommandField } from './play-state';
import type { PlayCommand, PlayLimits, PlayState } from './play-state';
import { spendRefusal } from './spend-commands';
import { SpendKind } from './spend-log';
import type { SpendCost } from './spend-log';
import { actions, playIn, Serial, spendId, spendOf, turnOf } from './spend-log-testing';
import type { ActionsTaken } from './spend-log-testing';
import { TEST_SPEND, within } from './testing';
import { QuickenedAction, TurnPhase } from './turn-state';

const LIMITS: PlayLimits = { ...within(HitPoints.parse(10)), spend: TEST_SPEND };
const MOST_SPENDS = 6;
const COUNTED = LIMITS.counted;
const NO_QUICKENED = QuickenedAction.parse(0);
const ONE_QUICKENED = QuickenedAction.parse(1);

const phases = constantFrom(TurnPhase.Turn, TurnPhase.OffTurn, TurnPhase.OutOfEncounter);
const taken = constantFrom<Exclude<ActionsTaken, 0>>(1, 2, 3, 4);
const costs = constantFrom<SpendCost>(
  actions(1),
  actions(2),
  actions(3),
  actions(4),
  { kind: SpendKind.Reaction },
  { kind: SpendKind.Free },
);
const starts = record({
  phase: phases,
  left: constantFrom<ActionsTaken>(0, 1, 2, 3),
  quickened: boolean(),
  reactionUsed: boolean(),
}).map(({ phase, left, quickened, reactionUsed }) =>
  playIn(turnOf(phase, left, { quickened: quickened ? ONE_QUICKENED : NO_QUICKENED, reactionUsed })),
);

/** `play` after each of `attempts` is spent in order, those the turn refuses skipped. */
function played(play: PlayState, attempts: readonly SpendCost[]): PlayState {
  let current = play;
  let serial = 1;
  for (const cost of attempts) {
    const command = spendOf(Serial.parse(serial), cost);
    serial += 1;
    current = applyPlayCommand(current, command, LIMITS);
  }
  return current;
}

function undo(serial: Serial): PlayCommand {
  return { field: PlayCommandField.UndoSpend, id: spendId(serial) };
}

describe('spending from the turn', () => {
  test('never takes more actions than the turn has', () => {
    assert(
      property(starts, array(costs, { maxLength: MOST_SPENDS }), (start, attempts) => {
        const after = played(start, attempts);
        expect(after.turn.actions).toBeLessThanOrEqual(start.turn.actions);
        expect(after.turn.actions).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  test('spend then undo restores the turn and the log', () => {
    const spend = record({ start: starts, before: array(costs, { maxLength: MOST_SPENDS }), cost: costs });
    assert(
      property(spend, ({ start, before, cost }) => {
        const play = played(start, before);
        const serial = Serial.parse(before.length + 1);
        const command = spendOf(serial, cost);
        pre(spendRefusal(play, command, { counted: COUNTED, points: LIMITS.resources }) === undefined);
        const spent = applyPlayCommand(play, command, LIMITS);
        const undone = applyPlayCommand(spent, undo(serial), LIMITS);
        expect(undone.turn).toEqual(play.turn);
        expect(undone.spendLog).toEqual(play.spendLog);
      }),
    );
  });

  test('a refused spend changes nothing', () => {
    assert(
      property(starts, taken, (start, count) => {
        const command = spendOf(Serial.parse(1), actions(count));
        pre(spendRefusal(start, command, { counted: COUNTED, points: LIMITS.resources }) !== undefined);
        expect(applyPlayCommand(start, command, LIMITS)).toEqual(start);
      }),
    );
  });
});
