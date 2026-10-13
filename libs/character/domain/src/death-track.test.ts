import { describe, expect, test } from 'bun:test';

import { DegreeOfSuccess } from '@pioneer/rules/sdk';

import {
  afterRecoveryCheck,
  deathThreshold,
  Doomed,
  Dying,
  FRESH_DEATH_TRACK,
  knockedOut,
  recovered,
  withDoomed,
  withDying,
  withWounded,
  Wounded,
} from './death-track';
import type { DeathTrack } from './death-track';

function track(dying: number, wounded = 0, doomed = 0): DeathTrack {
  return { dying: Dying.parse(dying), wounded: Wounded.parse(wounded), doomed: Doomed.parse(doomed), dead: false };
}

function died(dying: number, wounded = 0, doomed = 0): DeathTrack {
  return { ...track(dying, wounded, doomed), dead: true };
}

describe('deathThreshold', () => {
  test('is 4 less the doomed value', () => {
    expect(deathThreshold(Doomed.parse(0))).toBe(Dying.parse(4));
    expect(deathThreshold(Doomed.parse(1))).toBe(Dying.parse(3));
    expect(deathThreshold(Doomed.parse(4))).toBe(Dying.parse(0));
  });
});

describe('knockedOut', () => {
  test('gains dying 1 for a character with no wounded', () => {
    expect(knockedOut(FRESH_DEATH_TRACK, false)).toStrictEqual(track(1));
  });

  test('gains dying 2 on a critical hit', () => {
    expect(knockedOut(FRESH_DEATH_TRACK, true)).toStrictEqual(track(2));
  });

  test('adds the wounded value to the dying it gains', () => {
    expect(knockedOut(track(0, 2), false)).toStrictEqual(track(3, 2));
    expect(knockedOut(track(0, 1), true)).toStrictEqual(track(3, 1));
  });

  test('a character already dying takes the increase alone, not wounded again', () => {
    expect(knockedOut(track(1, 2), false)).toStrictEqual(track(2, 2));
    expect(knockedOut(track(1, 2), true)).toStrictEqual(track(3, 2));
  });

  test('dies on reaching dying 4', () => {
    expect(knockedOut(track(0, 3), false)).toStrictEqual(died(4, 3, 0));
  });

  test('dies sooner with doomed', () => {
    expect(knockedOut(track(0, 1, 2), false)).toStrictEqual(died(2, 1, 2));
  });

  test('a dead character is left as it was', () => {
    const dead = died(4, 1, 0);
    expect(knockedOut(dead, true)).toBe(dead);
  });
});

describe('recovered', () => {
  test('ends dying and gains wounded 1', () => {
    expect(recovered(track(2))).toStrictEqual(track(0, 1));
  });

  test('raises the wounded value it already has', () => {
    expect(recovered(track(1, 2))).toStrictEqual(track(0, 3));
  });

  test('does nothing for a character who is not dying', () => {
    const well = track(0, 1);
    expect(recovered(well)).toBe(well);
  });
});

describe('afterRecoveryCheck', () => {
  test('a critical success lowers dying by 2', () => {
    expect(afterRecoveryCheck(track(3), DegreeOfSuccess.CriticalSuccess)).toStrictEqual(track(1));
  });

  test('a success lowers dying by 1', () => {
    expect(afterRecoveryCheck(track(3), DegreeOfSuccess.Success)).toStrictEqual(track(2));
  });

  test('a failure raises dying by 1', () => {
    expect(afterRecoveryCheck(track(1), DegreeOfSuccess.Failure)).toStrictEqual(track(2));
  });

  test('a critical failure raises dying by 2', () => {
    expect(afterRecoveryCheck(track(1), DegreeOfSuccess.CriticalFailure)).toStrictEqual(track(3));
  });

  test('losing the last of dying gains wounded 1, or one more', () => {
    expect(afterRecoveryCheck(track(1), DegreeOfSuccess.Success)).toStrictEqual(track(0, 1));
    expect(afterRecoveryCheck(track(2, 1), DegreeOfSuccess.CriticalSuccess)).toStrictEqual(track(0, 2));
    expect(afterRecoveryCheck(track(1), DegreeOfSuccess.CriticalSuccess)).toStrictEqual(track(0, 1));
  });

  test('a failure does not add the wounded value again', () => {
    expect(afterRecoveryCheck(track(1, 2), DegreeOfSuccess.Failure)).toStrictEqual(track(2, 2));
  });

  test('dying that reaches the threshold is death', () => {
    expect(afterRecoveryCheck(track(3), DegreeOfSuccess.Failure)).toStrictEqual(died(4, 0, 0));
    expect(afterRecoveryCheck(track(2, 0, 1), DegreeOfSuccess.Failure)).toStrictEqual(died(3, 0, 1));
  });

  test('a critical failure past the threshold stops at dying 4', () => {
    expect(afterRecoveryCheck(track(3), DegreeOfSuccess.CriticalFailure)).toStrictEqual(died(4, 0, 0));
  });

  test('a character who is not dying, or is dead, has nothing to recover from', () => {
    const well = track(0, 1);
    const dead = died(4, 0, 0);
    expect(afterRecoveryCheck(well, DegreeOfSuccess.Failure)).toBe(well);
    expect(afterRecoveryCheck(dead, DegreeOfSuccess.CriticalSuccess)).toBe(dead);
  });
});

describe('corrections', () => {
  test('raising doomed to make the current dying fatal is death', () => {
    expect(withDoomed(track(2), Doomed.parse(2))).toStrictEqual(died(2, 0, 2));
  });

  test('lowering doomed does not undo a death', () => {
    expect(withDoomed(died(3, 0, 1), Doomed.parse(0))).toStrictEqual(died(3, 0, 0));
  });

  test('setting dying below the threshold undoes a death recorded by mistake', () => {
    expect(withDying(died(4, 0, 0), Dying.parse(1))).toStrictEqual(track(1));
  });

  test('setting dying at the threshold is death', () => {
    expect(withDying(track(0, 0, 1), Dying.parse(3))).toStrictEqual(died(3, 0, 1));
  });

  test('setting wounded changes nothing else', () => {
    expect(withWounded(track(1), Wounded.parse(3))).toStrictEqual(track(1, 3));
  });
});
