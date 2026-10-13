import { describe, expect, test } from 'bun:test';

import { resolveGrants } from '@pioneer/rules/grants';
import { entry, idOf, inputsOf } from '@pioneer/rules/grants/testing';
import { ConditionValue, ContentKind, HitPoints } from '@pioneer/rules/sdk';
import { array, assert, integer, property, uuid } from 'fast-check';

import { ConditionInstanceId, conditionRoots } from './conditions';
import type { ActiveCondition, ConditionValued } from './conditions';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { within } from './testing';

const CONDITIONS_MAX = 8;
const VALUE_MAX = 4;
const NAMES = ['frightened', 'sickened', 'clumsy'] as const;
const CONTENT = NAMES.map((slug) => ({ ...entry(slug), kind: ContentKind.Condition, valued: true }));
const VALUED: ConditionValued = new Map(NAMES.map((slug) => [idOf(slug), true]));
const LIMITS = { ...within(HitPoints.parse(10)), valued: VALUED };

const activeCondition = integer({ min: 0, max: NAMES.length - 1 }).chain((which) =>
  integer({ min: 1, max: VALUE_MAX }).chain((value) =>
    uuid().map((id): ActiveCondition => ({
      id: ConditionInstanceId.parse(id),
      condition: idOf(NAMES[which] ?? 'frightened'),
      value: ConditionValue.parse(value),
      duration: { kind: 'unlimited' },
    })),
  ),
);

/** `play` with `condition` added. */
function addTo(play: PlayState, condition: ActiveCondition): PlayState {
  return applyPlayCommand(play, { field: PlayCommandField.AddCondition, condition }, LIMITS);
}

/** A fresh character with `conditions` added in turn. */
function afflictedWith(conditions: readonly ActiveCondition[]): PlayState {
  let play = FRESH_PLAY;
  for (const condition of conditions) {
    play = addTo(play, condition);
  }
  return play;
}

/** The roll options the character has with `conditions` on it. */
function optionsOf(conditions: readonly ActiveCondition[]): readonly string[] {
  const roots = conditionRoots(conditions);
  return resolveGrants(inputsOf({ entries: CONTENT, roots })).rollOptions.map(String);
}

describe('conditions on a character', () => {
  test('adding one then removing it restores the effective set', () => {
    assert(
      property(array(activeCondition, { maxLength: CONDITIONS_MAX }), activeCondition, (held, extra) => {
        const before = afflictedWith(held);
        const added = applyPlayCommand(before, { field: PlayCommandField.AddCondition, condition: extra }, LIMITS);
        const removed = applyPlayCommand(added, { field: PlayCommandField.RemoveCondition, id: extra.id }, LIMITS);
        const same = before.conditions.some(({ id }) => id === extra.id);
        expect(same ? added.conditions : removed.conditions).toEqual(before.conditions);
        if (!same) {
          expect(optionsOf(removed.conditions)).toEqual(optionsOf(before.conditions));
        }
      }),
    );
  });

  test('however many instances of a condition, the character has it once at the highest value', () => {
    assert(
      property(array(activeCondition, { minLength: 1, maxLength: CONDITIONS_MAX }), (held) => {
        const options = optionsOf(held);
        for (const slug of NAMES) {
          const values = held.filter(({ condition }) => condition === idOf(slug)).map(({ value }) => Number(value));
          const valueOptions = options.filter((option) => option.startsWith(`self:condition:${slug}:`));
          expect(valueOptions).toEqual(values.length === 0 ? [] : [`self:condition:${slug}:${Math.max(...values)}`]);
        }
      }),
    );
  });
});
