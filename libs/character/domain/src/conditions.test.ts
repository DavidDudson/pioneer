import { describe, expect, test } from 'bun:test';

import { ConditionValue, ContentId, EventRef, HitPoints, OriginHopKind } from '@pioneer/rules/sdk';

import { ConditionInstanceId, ConditionProblem, conditionProblem, conditionRoots } from './conditions';
import type { ActiveCondition, ConditionCommand, ConditionValued } from './conditions';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { within } from './testing';

const FRIGHTENED = ContentId.parse('00000000-0000-4000-8000-0000000000f1');
const BLINDED = ContentId.parse('00000000-0000-4000-8000-0000000000b1');
const MISSING = ContentId.parse('00000000-0000-4000-8000-0000000000ff');
const FRIGHTENED_ID = ConditionInstanceId.parse('00000000-0000-4000-8000-000000000001');
const BLINDED_ID = ConditionInstanceId.parse('00000000-0000-4000-8000-000000000002');
const DEMORALIZE = EventRef.parse('00000000-0000-4000-8000-0000000000e1');
const VALUED: ConditionValued = new Map([
  [FRIGHTENED, true],
  [BLINDED, false],
]);
const LIMITS = { ...within(HitPoints.parse(10)), valued: VALUED };

const frightened = (value = 2): ActiveCondition => ({
  id: FRIGHTENED_ID,
  condition: FRIGHTENED,
  value: ConditionValue.parse(value),
  duration: { kind: 'unlimited' },
  appliedBy: DEMORALIZE,
});
const blinded: ActiveCondition = { id: BLINDED_ID, condition: BLINDED, duration: { kind: 'unlimited' } };

const add = (condition: ActiveCondition): ConditionCommand => ({ field: PlayCommandField.AddCondition, condition });

/** A character with frightened 2 and blinded. */
function afflicted(): PlayState {
  const withFrightened = applyPlayCommand(FRESH_PLAY, add(frightened()), LIMITS);
  return applyPlayCommand(withFrightened, add(blinded), LIMITS);
}

describe('condition commands', () => {
  test('addCondition keeps the condition, its value, duration and source', () => {
    const play = applyPlayCommand(FRESH_PLAY, add(frightened()), LIMITS);
    expect(play.conditions).toEqual([frightened()]);
  });

  test('setConditionValue changes the value of that instance only', () => {
    const set = { field: PlayCommandField.SetConditionValue, id: FRIGHTENED_ID, value: ConditionValue.parse(3) };
    expect(applyPlayCommand(afflicted(), set, LIMITS).conditions).toEqual([frightened(3), blinded]);
  });

  test('removeCondition drops that instance', () => {
    const remove = { field: PlayCommandField.RemoveCondition, id: FRIGHTENED_ID };
    expect(applyPlayCommand(afflicted(), remove, LIMITS).conditions).toEqual([blinded]);
  });

  test('adding an instance that is already there changes nothing', () => {
    const once = applyPlayCommand(FRESH_PLAY, add(frightened()), LIMITS);
    const again = applyPlayCommand(once, add(frightened(3)), LIMITS);
    expect(again.conditions).toEqual([frightened()]);
  });
});

/** The problem `command` runs into on a character holding `held`. */
function refusedWith(held: readonly ActiveCondition[], command: ConditionCommand): ConditionProblem | undefined {
  return conditionProblem(held, command, VALUED);
}

/** The problem adding `condition` to a character holding nothing runs into. */
function refusedAdding(condition: ActiveCondition): ConditionProblem | undefined {
  return refusedWith([], add(condition));
}

const setValue = (id: ConditionInstanceId): ConditionCommand => ({
  field: PlayCommandField.SetConditionValue,
  id,
  value: ConditionValue.parse(1),
});

describe('a refused condition edit', () => {
  test('adding a condition the content lacks', () => {
    expect(refusedAdding({ ...blinded, condition: MISSING })).toBe(ConditionProblem.Unknown);
  });

  test('adding a valued condition with no value', () => {
    expect(refusedAdding({ ...frightened(), value: undefined })).toBe(ConditionProblem.Value);
  });

  test('adding a value to a condition without one', () => {
    expect(refusedAdding({ ...blinded, value: ConditionValue.parse(1) })).toBe(ConditionProblem.Value);
  });

  test('setting a value on a condition without one', () => {
    expect(refusedWith([blinded], setValue(BLINDED_ID))).toBe(ConditionProblem.Value);
  });

  test('setting the value of an instance that is not there', () => {
    expect(refusedWith([], setValue(FRIGHTENED_ID))).toBe(ConditionProblem.Missing);
  });

  test('removing an instance that is not there', () => {
    const remove = { field: PlayCommandField.RemoveCondition, id: BLINDED_ID };
    expect(refusedWith([], remove)).toBe(ConditionProblem.Missing);
  });

  test('is none for a fitting edit', () => {
    expect(refusedAdding(frightened())).toBeUndefined();
  });
});

describe('conditionRoots', () => {
  test('puts each condition on the character behind a condition hop with its value and source', () => {
    expect(conditionRoots([frightened(), blinded])).toEqual([
      {
        entry: FRIGHTENED,
        hop: {
          kind: OriginHopKind.Condition,
          condition: FRIGHTENED,
          value: ConditionValue.parse(2),
          appliedBy: DEMORALIZE,
        },
      },
      { entry: BLINDED, hop: { kind: OriginHopKind.Condition, condition: BLINDED } },
    ]);
  });
});
