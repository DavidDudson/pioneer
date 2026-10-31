import { describe, expect, test } from 'bun:test';

import { fixedClock, UserId } from '@pioneer/shared/kernel';

import type { Character } from './character';
import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { activeCustomEffects, CustomEffectProblem, customEffectProblem, customEffectRules } from './custom-effect';
import {
  CUSTOM_EFFECT_TOGGLES_MAX,
  CustomEffectId,
  CustomEffectInput,
  CustomEffectSchema,
} from './custom-effect-schema';
import { OverrideRole, overrideTime } from './override-schema';
import { CharacterBuilder } from './testing';

const AUTHOR = UserId.parse('00000000-0000-4000-8000-0000000000a1');
const GM = UserId.parse('00000000-0000-4000-8000-0000000000a2');
const BLESSING = CustomEffectId.parse('00000000-0000-4000-8000-0000000000c1');
const THEN = fixedClock('2026-02-01T00:00:00Z').now();
const LATER = fixedClock('2026-03-01T00:00:00Z').now();

const INPUT = CustomEffectInput.parse({
  name: 'Blessing of the Hearth',
  reason: 'GM boon from the festival',
  lines: [
    { target: 'ac', value: 1, type: 'status' },
    { target: 'save:will', value: 2 },
  ],
});

const blank = new CharacterBuilder().build();

function added(character: Character): Character {
  const patch: CharacterPatch = { field: CharacterPatchField.AddCustomEffect, effect: INPUT };
  return character.apply(patch, THEN, { actor: AUTHOR, newCustomEffectId: BLESSING });
}

function toggled(character: Character, enabled: boolean, actor = AUTHOR): Character {
  const patch: CharacterPatch = { field: CharacterPatchField.ToggleCustomEffect, id: BLESSING, enabled };
  return character.apply(patch, LATER, { actor });
}

describe('adding a custom effect', () => {
  test('stores the author, time and reason, switched on', () => {
    const [effect] = added(blank).document.customEffects;

    expect(effect).toMatchObject({ id: BLESSING, name: 'Blessing of the Hearth', by: AUTHOR, enabled: true });
    expect(effect?.at).toBe(overrideTime(THEN));
    expect(effect?.toggles).toEqual([]);
  });

  test('compiles each line to a modifier whose hop carries the effect name', () => {
    const rules = customEffectRules(added(blank).document);

    expect(rules).toHaveLength(2);
    expect(rules[0]?.element).toMatchObject({ key: 'FlatModifier', selectors: ['ac'], type: 'status', value: 1 });
    expect(rules[1]?.element).toMatchObject({ selectors: ['save:will'], type: 'untyped', value: 2 });
    expect(rules[0]?.element).toMatchObject({ display: { label: 'Blessing of the Hearth' } });
    expect(rules[0]?.origin.hops).toMatchObject([{ kind: 'override', by: AUTHOR, note: 'GM boon from the festival' }]);
  });

  test('a GM adds an effect that keeps the GM role', () => {
    const patch: CharacterPatch = { field: CharacterPatchField.AddCustomEffect, effect: INPUT };
    const character = blank.apply(patch, THEN, { actor: GM, actorRole: OverrideRole.Gm, newCustomEffectId: BLESSING });

    expect(character.document.customEffects[0]).toMatchObject({ by: GM, byRole: 'gm' });
  });

  test('is refused with no reason, no name or no lines, by message key', () => {
    for (const bad of [{ reason: '  ' }, { name: ' ' }, { lines: [] }]) {
      const result = CustomEffectInput.safeParse({ ...INPUT, ...bad });

      expect(result.success).toBe(false);
    }
  });
});

describe('switching a custom effect', () => {
  test('off compiles nothing and records who and when; on restores every line', () => {
    const off = toggled(added(blank), false);
    const on = toggled(off, true, GM);

    expect(customEffectRules(off.document)).toEqual([]);
    expect(off.document.customEffects[0]?.toggles).toEqual([
      { by: AUTHOR, byRole: 'player', at: overrideTime(LATER), enabled: false },
    ]);
    expect(customEffectRules(on.document)).toHaveLength(2);
    expect(on.document.customEffects[0]?.toggles).toHaveLength(2);
  });

  test('to the state it is already in changes nothing', () => {
    const same = toggled(added(blank), true);

    expect(same.document.customEffects[0]?.toggles).toEqual([]);
  });

  test('is refused once the record is full', () => {
    const full = added(blank);
    const toggles = Array.from({ length: CUSTOM_EFFECT_TOGGLES_MAX }, () => ({
      by: AUTHOR,
      byRole: OverrideRole.Player,
      at: overrideTime(THEN),
      enabled: true,
    }));
    const crowded = CustomEffectSchema.parse({
      id: BLESSING,
      ...INPUT,
      by: AUTHOR,
      byRole: OverrideRole.Player,
      at: overrideTime(THEN),
      enabled: true,
      toggles,
    });
    const document = { ...full.document, customEffects: [crowded] };
    const patch = { field: CharacterPatchField.ToggleCustomEffect, id: BLESSING, enabled: false } as const;

    expect(customEffectProblem(document, patch)).toBe(CustomEffectProblem.TogglesFull);
  });
});

describe('removing a custom effect', () => {
  test('archives it with who, when and why, and compiles nothing', () => {
    const patch: CharacterPatch = {
      field: CharacterPatchField.RemoveCustomEffect,
      id: BLESSING,
      reason: CustomEffectInput.shape.reason.parse('Festival over'),
    };
    const removed = added(blank).apply(patch, LATER, { actor: AUTHOR });

    expect(removed.document.customEffects).toHaveLength(1);
    expect(removed.document.customEffects[0]?.removed).toMatchObject({ by: AUTHOR, reason: 'Festival over' });
    expect(activeCustomEffects(removed.document)).toEqual([]);
    expect(customEffectRules(removed.document)).toEqual([]);
  });

  test('an effect that is not there is unknown', () => {
    const patch = { field: CharacterPatchField.ToggleCustomEffect, id: BLESSING, enabled: false } as const;

    expect(customEffectProblem(blank.document, patch)).toBe(CustomEffectProblem.Unknown);
  });
});
