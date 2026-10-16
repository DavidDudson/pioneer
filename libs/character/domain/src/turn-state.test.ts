import { describe, expect, test } from 'bun:test';

import { ConditionValue, ContentId } from '@pioneer/rules/sdk';

import { ActionRestriction, ConditionInstanceId, UNLIMITED } from './conditions';
import type { ActiveCondition } from './conditions';
import { TurnEventKind } from './turn-events';
import { ActionCount, QuickenedAction, refilled, turnEnded, TurnPhase } from './turn-state';
import type { EconomyConditions, TurnState } from './turn-state';

const QUICKENED = ContentId.parse('00000000-0000-4000-8000-0000000000c1');
const SLOWED = ContentId.parse('00000000-0000-4000-8000-0000000000c2');
const STUNNED = ContentId.parse('00000000-0000-4000-8000-0000000000c3');
const ECONOMY: EconomyConditions = { quickened: QUICKENED, slowed: SLOWED, stunned: STUNNED };

interface Held {
  readonly value?: number;
  readonly restriction?: string;
}

function held(condition: ContentId, count: number, { value, restriction }: Held = {}): ActiveCondition {
  return {
    id: ConditionInstanceId.parse(`00000000-0000-4000-8000-00000000020${count}`),
    condition,
    value: value === undefined ? undefined : ConditionValue.parse(value),
    duration: UNLIMITED,
    restriction: restriction === undefined ? undefined : ActionRestriction.parse(restriction),
  };
}

/** The phase, the actions and the quickened action of a turn, as plain values. */
function economyOf({ phase, actions, quickened }: TurnState): readonly [string, number, number] {
  return [phase, actions, quickened];
}

describe('refilled', () => {
  test('a character with no action conditions has 3 actions and its reaction back', () => {
    const { turn, conditions, events } = refilled([], ECONOMY);
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 3, 0]);
    expect(turn.reactionUsed).toBe(false);
    expect(conditions).toStrictEqual([]);
    expect(events).toStrictEqual([]);
  });

  test('quickened adds one action of its own, with the restriction its source gives', () => {
    const { turn } = refilled([held(QUICKENED, 1, { restriction: 'Strike or Stride only' })], ECONOMY);
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 3, 1]);
    expect(String(turn.quickenedFor)).toBe('Strike or Stride only');
  });

  test('slowed takes its value from the ordinary actions', () => {
    const { turn } = refilled([held(SLOWED, 1, { value: 2 })], ECONOMY);
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 1, 0]);
  });

  test('slowed does not cost the quickened action', () => {
    const { turn } = refilled([held(QUICKENED, 1), held(SLOWED, 2, { value: 1 })], ECONOMY);
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 2, 1]);
  });

  test('stunned takes actions, and ends when it has taken what it holds', () => {
    const { turn, conditions, events } = refilled([held(STUNNED, 1, { value: 2 })], ECONOMY);
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 1, 0]);
    expect(conditions).toStrictEqual([]);
    expect(events.map(({ kind }) => kind)).toStrictEqual([TurnEventKind.ConditionEnded]);
  });

  test('stunned 4 takes all 3 actions and is left at 1', () => {
    const { turn, conditions, events } = refilled([held(STUNNED, 1, { value: 4 })], ECONOMY);
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 0, 0]);
    expect(conditions.map(({ value }) => Number(value))).toStrictEqual([1]);
    expect(events.map(({ kind }) => kind)).toStrictEqual([TurnEventKind.ConditionLowered]);
  });

  test('quickened, slowed and stunned together', () => {
    const { turn, conditions } = refilled(
      [
        held(QUICKENED, 1, { restriction: 'Strike only' }),
        held(SLOWED, 2, { value: 1 }),
        held(STUNNED, 3, { value: 4 }),
      ],
      ECONOMY,
    );
    // 3 actions less slowed 1 leaves 2, and the quickened one makes 3; stunned 4 takes all 3 and is left at 1.
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 0, 0]);
    expect(turn.quickenedFor).toBeUndefined();
    expect(conditions.filter(({ condition }) => condition === STUNNED).map(({ value }) => Number(value))).toStrictEqual(
      [1],
    );
  });

  test('stunned takes the ordinary actions before the quickened one', () => {
    const { turn } = refilled([held(QUICKENED, 1), held(STUNNED, 2, { value: 2 })], ECONOMY);
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 1, 1]);
  });

  test('stunned with no value takes every action and stays', () => {
    const { turn, conditions } = refilled([held(QUICKENED, 1), held(STUNNED, 2)], ECONOMY);
    expect(economyOf(turn)).toStrictEqual([TurnPhase.Turn, 0, 0]);
    expect(conditions).toHaveLength(2);
  });
});

describe('turnEnded', () => {
  test('drops the actions and goes off-turn, keeping the reaction as it was', () => {
    const turn: TurnState = {
      phase: TurnPhase.Turn,
      actions: ActionCount.parse(2),
      quickened: QuickenedAction.parse(1),
      reactionUsed: true,
    };
    const ended = turnEnded(turn);
    expect(economyOf(ended)).toStrictEqual([TurnPhase.OffTurn, 0, 0]);
    expect(ended.reactionUsed).toBe(true);
  });
});
