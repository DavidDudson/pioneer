import { describe, expect, test } from 'bun:test';

import { ContentId, HitPoints } from '@pioneer/rules/sdk';

import { ActionRestriction } from './conditions';
import { abilityUseKey, Boundary } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { applyPlayCommand, PlayCommandField } from './play-state';
import type { PlayCommand, PlayLimits, PlayState } from './play-state';
import { ResourceCount } from './resource-count';
import { applySpendCommand, isSpendCommand, spendRefusal } from './spend-commands';
import { SpendKind, SpendProblem } from './spend-log';
import type { SpendCommand, SpendCost } from './spend-log';
import { actions, OWN_TURN, playIn, Serial, spendId, spendOf, turnOf } from './spend-log-testing';
import { TEST_SPEND, within } from './testing';
import { ActionCount, QuickenedAction, TurnPhase } from './turn-state';

const FREQUENCY = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-0000000000aa'));
const COUNTED: CountedMaxima = {
  slots: new Map(),
  uses: new Map([[FREQUENCY, { max: ResourceCount.parse(1), boundary: Boundary.Turn }]]),
};
const LIMITS: PlayLimits = { ...within(HitPoints.parse(10)), counted: COUNTED, spend: TEST_SPEND };
const FIRST = Serial.parse(1);
const SECOND = Serial.parse(2);
const ONE_ACTION = actions(1);
const TWO_ACTIONS = actions(2);
const THREE_ACTIONS = actions(3);
const FOUR_ACTIONS = actions(4);
const REACTION: SpendCost = { kind: SpendKind.Reaction };
const FREE: SpendCost = { kind: SpendKind.Free };
const QUICKENED = QuickenedAction.parse(1);

function apply(play: PlayState, command: PlayCommand): PlayState {
  return applyPlayCommand(play, command, LIMITS);
}

function refusal(play: PlayState, command: SpendCommand): SpendProblem | undefined {
  return spendRefusal(play, command, { counted: COUNTED });
}

function undo(serial: Serial): PlayCommand {
  return { field: PlayCommandField.UndoSpend, id: spendId(serial) };
}

describe('spending actions', () => {
  test('takes the actions from the turn and logs the spend with its time', () => {
    const play = apply(playIn(OWN_TURN), spendOf(FIRST, TWO_ACTIONS));
    expect(play.turn.actions).toBe(ActionCount.parse(1));
    expect(play.spendLog).toHaveLength(1);
    expect(play.spendLog[0]?.at).toBe(TEST_SPEND.now);
  });

  test('more than is left is refused and changes nothing', () => {
    const spent = apply(playIn(OWN_TURN), spendOf(FIRST, TWO_ACTIONS));
    const command = spendOf(SECOND, TWO_ACTIONS);
    expect(refusal(spent, command)).toBe(SpendProblem.TooFewActions);
    expect(apply(spent, command)).toEqual(spent);
  });

  test('exactly what is left is allowed', () => {
    const spent = apply(playIn(OWN_TURN), spendOf(FIRST, TWO_ACTIONS));
    const play = apply(spent, spendOf(SECOND, ONE_ACTION));
    expect(play.turn.actions).toBe(ActionCount.parse(0));
  });

  test('the same spend id twice is refused', () => {
    const spent = apply(playIn(OWN_TURN), spendOf(FIRST, ONE_ACTION));
    expect(refusal(spent, spendOf(FIRST, ONE_ACTION))).toBe(SpendProblem.AlreadySpent);
  });

  test('off turn is refused', () => {
    const play = playIn(turnOf(TurnPhase.OffTurn, 0));
    expect(refusal(play, spendOf(FIRST, ONE_ACTION))).toBe(SpendProblem.OffTurn);
  });

  test('out of an encounter only logs', () => {
    const play = apply(playIn(turnOf(TurnPhase.OutOfEncounter, 0)), spendOf(FIRST, THREE_ACTIONS));
    expect(play.turn.actions).toBe(ActionCount.parse(0));
    expect(play.spendLog).toHaveLength(1);
  });
});

describe('the quickened action', () => {
  const quick = playIn(turnOf(TurnPhase.Turn, 3, { quickened: QUICKENED }));

  test('pays the last action after the ordinary ones', () => {
    const play = apply(quick, spendOf(FIRST, FOUR_ACTIONS));
    expect(play.turn.actions).toBe(ActionCount.parse(0));
    expect(play.turn.quickened).toBe(QuickenedAction.parse(0));
  });

  test('is used when the ordinary actions run out', () => {
    const empty = playIn(turnOf(TurnPhase.Turn, 0, { quickened: QUICKENED }));
    const play = apply(empty, spendOf(FIRST, ONE_ACTION));
    expect(play.turn.quickened).toBe(QuickenedAction.parse(0));
    expect(play.spendLog[0]?.quickened).toBe(QUICKENED);
  });

  test('is not used when it is restricted', () => {
    const restricted = playIn(
      turnOf(TurnPhase.Turn, 0, { quickened: QUICKENED, quickenedFor: ActionRestriction.parse('Strike or Stride') }),
    );
    expect(refusal(restricted, spendOf(FIRST, ONE_ACTION))).toBe(SpendProblem.TooFewActions);
  });
});

describe('free actions and reactions', () => {
  test('a free action spends no action, even with none left', () => {
    const empty = playIn(turnOf(TurnPhase.Turn, 0));
    const play = apply(empty, spendOf(FIRST, FREE));
    expect(play.turn).toEqual(empty.turn);
    expect(play.spendLog).toHaveLength(1);
  });

  test('a reaction spends the reaction and no action', () => {
    const play = apply(playIn(OWN_TURN), spendOf(FIRST, REACTION));
    expect(play.turn.reactionUsed).toBe(true);
    expect(play.turn.actions).toBe(OWN_TURN.actions);
  });

  test('a second reaction is refused', () => {
    const spent = apply(playIn(OWN_TURN), spendOf(FIRST, REACTION));
    expect(refusal(spent, spendOf(SECOND, REACTION))).toBe(SpendProblem.ReactionSpent);
  });

  test('a reaction can be used off turn', () => {
    const play = playIn(turnOf(TurnPhase.OffTurn, 0));
    expect(refusal(play, spendOf(FIRST, REACTION))).toBeUndefined();
  });
});

describe('frequency uses', () => {
  test('the spend records the use', () => {
    const play = apply(playIn(OWN_TURN), { ...spendOf(FIRST, ONE_ACTION), use: FREQUENCY });
    expect(play.resources.uses[FREQUENCY]).toBe(ResourceCount.parse(1));
  });

  test('a frequency with no use left refuses the spend', () => {
    const used = apply(playIn(OWN_TURN), { ...spendOf(FIRST, ONE_ACTION), use: FREQUENCY });
    expect(refusal(used, { ...spendOf(SECOND, ONE_ACTION), use: FREQUENCY })).toBe(SpendProblem.NoUseLeft);
  });
});

describe('undoing a spend', () => {
  test('gives back the actions, the use and the log entry', () => {
    const spent = apply(playIn(OWN_TURN), { ...spendOf(FIRST, TWO_ACTIONS), use: FREQUENCY });
    const undone = apply(spent, undo(FIRST));
    expect(undone.turn).toEqual(OWN_TURN);
    expect(undone.spendLog).toEqual([]);
    expect(undone.resources.uses[FREQUENCY]).toBe(ResourceCount.parse(0));
  });

  test('gives back the quickened action', () => {
    const empty = playIn(turnOf(TurnPhase.Turn, 0, { quickened: QUICKENED }));
    const spent = apply(empty, spendOf(FIRST, ONE_ACTION));
    const undone = apply(spent, undo(FIRST));
    expect(undone.turn).toEqual(empty.turn);
  });

  test('gives back the reaction', () => {
    const spent = apply(playIn(OWN_TURN), spendOf(FIRST, REACTION));
    const undone = apply(spent, undo(FIRST));
    expect(undone.turn.reactionUsed).toBe(false);
  });

  test('an unknown spend is refused', () => {
    expect(refusal(playIn(OWN_TURN), { field: PlayCommandField.UndoSpend, id: spendId(FIRST) })).toBe(
      SpendProblem.NotSpent,
    );
  });

  test('actions of a turn that is over are not given back', () => {
    const spent = apply(playIn(OWN_TURN), spendOf(FIRST, ONE_ACTION));
    const over = { ...spent, turn: turnOf(TurnPhase.OffTurn, 0) };
    expect(refusal(over, { field: PlayCommandField.UndoSpend, id: spendId(FIRST) })).toBe(SpendProblem.OffTurn);
  });
});

test('isSpendCommand tells the spend edits from the rest', () => {
  expect(isSpendCommand(spendOf(FIRST, FREE))).toBe(true);
  expect(isSpendCommand({ field: PlayCommandField.Heal })).toBe(false);
  expect(applySpendCommand).toBeDefined();
});
