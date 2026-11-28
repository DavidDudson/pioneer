import { describe, expect, test } from 'bun:test';

import { newId } from '@pioneer/shared/kernel';

import { CompanionId } from './companion';
import {
  applyCompanionCommand,
  canBecome,
  CompanionCommandField,
  CompanionProblem,
  companionProblem,
  CompanionStatus,
  companionStatus,
  isCompanionUsable,
} from './companion-status';
import type { CompanionCommand, CompanionsPlay } from './companion-status';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayLimits } from './play-state';

const pip = CompanionId.parse(newId());
const moth = CompanionId.parse(newId());

// SAFETY: a companion status edit reads no limit, so an empty one stands in.
const NO_LIMITS = {} as PlayLimits;

const all = Object.values(CompanionStatus);

const move = (companion: CompanionId, status: CompanionStatus): CompanionCommand => ({
  field: CompanionCommandField.SetCompanionStatus,
  companion,
  status,
});

describe('a companion with no entry', () => {
  test('is active and usable', () => {
    expect(companionStatus({}, pip)).toBe(CompanionStatus.Active);
    expect(isCompanionUsable({}, pip)).toBe(true);
  });
});

describe('the status transitions', () => {
  test.each([
    [CompanionStatus.Active, CompanionStatus.Absent],
    [CompanionStatus.Active, CompanionStatus.Absorbed],
    [CompanionStatus.Active, CompanionStatus.Dead],
    [CompanionStatus.Absent, CompanionStatus.Active],
    [CompanionStatus.Absent, CompanionStatus.Dead],
    [CompanionStatus.Absorbed, CompanionStatus.Active],
    [CompanionStatus.Absorbed, CompanionStatus.Dead],
    [CompanionStatus.Dead, CompanionStatus.Active],
  ])('%s to %s is allowed', (from, to) => {
    expect(canBecome(from, to)).toBe(true);
  });

  test.each([
    [CompanionStatus.Absent, CompanionStatus.Absorbed],
    [CompanionStatus.Absorbed, CompanionStatus.Absent],
    [CompanionStatus.Dead, CompanionStatus.Absent],
    [CompanionStatus.Dead, CompanionStatus.Absorbed],
  ])('%s to %s is refused', (from, to) => {
    expect(canBecome(from, to)).toBe(false);
  });

  test('staying where it is is always allowed', () => {
    for (const status of all) {
      expect(canBecome(status, status)).toBe(true);
    }
  });

  test('every status reaches every other, directly or through active', () => {
    for (const from of all) {
      for (const to of all) {
        const direct = canBecome(from, to);
        const viaActive = canBecome(from, CompanionStatus.Active) && canBecome(CompanionStatus.Active, to);
        expect(direct || viaActive).toBe(true);
      }
    }
  });

  test('only an active companion is usable', () => {
    for (const status of all) {
      const companions: CompanionsPlay = { [pip]: { status } };
      expect(isCompanionUsable(companions, pip)).toBe(status === CompanionStatus.Active);
    }
  });
});

describe('refusing a status edit', () => {
  test('a companion the character does not own is unknown', () => {
    expect(companionProblem({}, move(moth, CompanionStatus.Dead), [pip])).toBe(CompanionProblem.Unknown);
  });

  test('a move the machine forbids is illegal', () => {
    const dead: CompanionsPlay = { [pip]: { status: CompanionStatus.Dead } };

    expect(companionProblem(dead, move(pip, CompanionStatus.Absent), [pip])).toBe(CompanionProblem.Illegal);
  });

  test('an allowed move on a live companion is not refused', () => {
    expect(companionProblem({}, move(pip, CompanionStatus.Dead), [pip])).toBeUndefined();
  });
});

describe('applying a status edit to play state', () => {
  test('sets the status of that companion only', () => {
    const after = applyPlayCommand(FRESH_PLAY, move(pip, CompanionStatus.Dead), NO_LIMITS);

    expect(after.companions).toStrictEqual({ [pip]: { status: CompanionStatus.Dead } });
    expect(companionStatus(after.companions, moth)).toBe(CompanionStatus.Active);
  });

  test('raising the dead sets it active again', () => {
    const dead = applyCompanionCommand({}, move(pip, CompanionStatus.Dead));
    const raised = applyCompanionCommand(dead, move(pip, CompanionStatus.Active));

    expect(companionStatus(raised, pip)).toBe(CompanionStatus.Active);
  });

  test('does not touch Hit Points or conditions', () => {
    const after = applyPlayCommand(FRESH_PLAY, move(pip, CompanionStatus.Absent), NO_LIMITS);

    expect(after.hp).toStrictEqual(FRESH_PLAY.hp);
    expect(after.conditions).toStrictEqual(FRESH_PLAY.conditions);
  });

  test('its field is a play command field', () => {
    expect(PlayCommandField.SetCompanionStatus).toBe(CompanionCommandField.SetCompanionStatus);
  });

  test('a play state with no companions reads as none', () => {
    expect(FRESH_PLAY.companions).toStrictEqual({});
  });
});
