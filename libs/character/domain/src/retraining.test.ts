import { describe, expect, test } from 'bun:test';

import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';

import type { Character } from './character';
import { CharacterPatchField, CharacterPatchSchema } from './character-patch';
import { RetrainDays, retrainDaysFor } from './retraining-fields';
import { CharacterBuilder } from './testing';

installRulesFakes();

const now = fixedClock('2026-10-07T10:00:00Z').now();
const FEAT = SlotKey.parse('feat:class:2');
const OLD = ChoiceValue.parse('old-feat');
const NEW = ChoiceValue.parse('new-feat');
const days = (count: number): RetrainDays => RetrainDays.parse(count);

function holding(): Character {
  return new CharacterBuilder().picking(FEAT, OLD).build();
}

function started(character: Character = holding()): Character {
  return character.apply({ field: CharacterPatchField.StartRetraining, slot: FEAT, to: NEW }, now);
}

function worked(character: Character, count: number): Character {
  return character.apply({ field: CharacterPatchField.WorkRetraining, days: days(count) }, now);
}

describe('days a retraining takes', () => {
  test.each([
    ['feat:class:2', 7],
    ['skill-increase:3', 7],
    ['repertoire:bard:1:0', 7],
    ['choice:fighter-weapon-group:0', 30],
  ])('%s takes %d days', (slot, expected) => {
    expect(retrainDaysFor(SlotKey.parse(slot))).toBe(RetrainDays.parse(expected));
  });

  test.each(['boost:1:ancestry:0', 'ancestry', 'class', 'language:1:0'])('%s can not be retrained', (slot) => {
    expect(retrainDaysFor(SlotKey.parse(slot))).toBeUndefined();
  });
});

describe('a retraining project', () => {
  test('starts with the days the slot takes and none worked', () => {
    expect(started().document.build.retraining).toMatchObject({ slot: FEAT, to: NEW, daysNeeded: 7, daysDone: 0 });
  });

  test('keeps the old pick while days are worked', () => {
    const character = worked(started(), 3);

    expect(Number(character.document.build.retraining?.daysDone)).toBe(3);
    expect(character.document.build.choices[FEAT]).toBe(OLD);
  });

  test('swaps the pick on the last day and ends the project, with no repertoire swap counted', () => {
    const character = worked(worked(started(), 3), 4);

    expect(character.document.build.choices[FEAT]).toBe(NEW);
    expect(character.document.build.retraining).toBeUndefined();
    expect(character.document.build.repertoireSwaps).toEqual([]);
  });

  test('takes no more than the days needed', () => {
    expect(worked(started(), 30).document.build.choices[FEAT]).toBe(NEW);
  });

  test('can be cancelled with the old pick kept', () => {
    const character = worked(started(), 5).apply({ field: CharacterPatchField.CancelRetraining }, now);

    expect(character.document.build.retraining).toBeUndefined();
    expect(character.document.build.choices[FEAT]).toBe(OLD);
  });

  test('refuses a second project, and work with none', () => {
    expect(() => started(started())).toThrow(TypeError);
    expect(() => worked(holding(), 1)).toThrow(TypeError);
  });
});

describe('retraining patch', () => {
  const start = { field: CharacterPatchField.StartRetraining, slot: FEAT, to: NEW };

  test.each([1, 30])('takes %d days of work', (count) => {
    expect(CharacterPatchSchema.safeParse({ field: CharacterPatchField.WorkRetraining, days: count }).success).toBe(
      true,
    );
  });

  test.each([0, 31, 1.5])('refuses %d days of work', (count) => {
    expect(CharacterPatchSchema.safeParse({ field: CharacterPatchField.WorkRetraining, days: count }).success).toBe(
      false,
    );
  });

  test('takes a start and a cancel', () => {
    expect(CharacterPatchSchema.safeParse(start).success).toBe(true);
    expect(CharacterPatchSchema.safeParse({ field: CharacterPatchField.CancelRetraining }).success).toBe(true);
  });
});
