import { describe, expect, test } from 'bun:test';

import { Selector } from '@pioneer/rules/sdk';
import { fixedClock, UserId } from '@pioneer/shared/kernel';

import type { Character } from './character';
import { activeOverrides, OverrideProblem, overrideProblem, overrideRules } from './character-override';
import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { OverrideId, OverrideInput, overrideTime } from './override-schema';
import { CharacterBuilder } from './testing';

const AUTHOR = UserId.parse('00000000-0000-4000-8000-0000000000a1');
const EDITOR = UserId.parse('00000000-0000-4000-8000-0000000000a2');
const FIRST = OverrideId.parse('00000000-0000-4000-8000-0000000000b1');
const SECOND = OverrideId.parse('00000000-0000-4000-8000-0000000000b2');
const THEN = fixedClock('2026-02-01T00:00:00Z').now();
const LATER = fixedClock('2026-03-01T00:00:00Z').now();
const THEN_ISO = overrideTime(THEN);
const LATER_ISO = overrideTime(LATER);

const ADJUST = OverrideInput.parse({ target: 'ac', mode: 'adjust', value: 2, type: 'item', reason: 'Shield spell' });
const SET = OverrideInput.parse({ target: 'hp:max', mode: 'set', value: 40, reason: 'GM ruling' });

function added(character: Character, input: OverrideInput, id: OverrideId): Character {
  const patch: CharacterPatch = { field: CharacterPatchField.AddOverride, override: input };
  return character.apply(patch, THEN, { actor: AUTHOR, newOverrideId: id });
}

const blank = new CharacterBuilder().build();

describe('adding an override', () => {
  test('stores the author, time and reason beside the inputs', () => {
    const [override] = added(blank, ADJUST, FIRST).document.overrides;

    expect(override).toMatchObject({ id: FIRST, target: 'ac', value: 2, reason: 'Shield spell', by: AUTHOR });
    expect(override?.at).toBe(THEN_ISO);
    expect(override?.revisions).toEqual([]);
  });

  test('an adjust compiles to a typed modifier, a set to a Change that pins, each with an override hop', () => {
    const character = added(added(blank, ADJUST, FIRST), SET, SECOND);
    const [modifier, change] = overrideRules(character.document);

    expect(modifier?.element).toMatchObject({ key: 'FlatModifier', selectors: ['ac'], type: 'item', value: 2 });
    expect(change?.element).toMatchObject({ key: 'Change', selector: 'hp:max', mode: 'override', value: 40 });
    expect(modifier?.origin.hops).toMatchObject([{ kind: 'override', by: AUTHOR, note: 'Shield spell' }]);
    expect(JSON.stringify(modifier?.origin.hops)).toContain('2026-02-01T00:00:00Z');
  });

  test('an adjust with no type is untyped', () => {
    const untyped = OverrideInput.parse({ target: 'ac', mode: 'adjust', value: -1, reason: 'Slippery floor' });
    const [rule] = overrideRules(added(blank, untyped, FIRST).document);

    expect(rule?.element).toMatchObject({ key: 'FlatModifier', type: 'untyped' });
  });

  test('is refused without a reason, or with only spaces, by the message key', () => {
    for (const reason of ['', '   ']) {
      const result = OverrideInput.safeParse({ ...ADJUST, reason });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain('character.validation.overrideReasonRequired');
    }
  });
});

describe('editing an override', () => {
  const edit: CharacterPatch = {
    field: CharacterPatchField.EditOverride,
    id: FIRST,
    override: OverrideInput.parse({ target: 'ac', mode: 'adjust', value: 3, reason: 'Heightened' }),
  };
  const edited = added(blank, ADJUST, FIRST).apply(edit, LATER, { actor: EDITOR });

  test('records the editor and keeps the state it replaces', () => {
    const [override] = edited.document.overrides;

    expect(override).toMatchObject({ value: 3, reason: 'Heightened', by: EDITOR });
    expect(override?.at).toBe(LATER_ISO);
    expect(override?.revisions).toMatchObject([{ by: AUTHOR, value: 2, type: 'item', reason: 'Shield spell' }]);
  });

  test('compiles the new state only', () => {
    expect(overrideRules(edited.document).map(({ element }) => element)).toMatchObject([{ value: 3 }]);
  });
});

describe('removing an override', () => {
  const remove: CharacterPatch = {
    field: CharacterPatchField.RemoveOverride,
    id: FIRST,
    reason: OverrideInput.shape.reason.parse('No longer applies'),
  };
  const removed = added(added(blank, ADJUST, FIRST), SET, SECOND).apply(remove, LATER, { actor: EDITOR });

  test('keeps it on record with who removed it, when and why', () => {
    const [override] = removed.document.overrides;

    expect(override?.removed).toMatchObject({ by: EDITOR, reason: 'No longer applies' });
    expect(override?.removed?.at).toBe(LATER_ISO);
  });

  test('takes it out of force and out of the compiled rules', () => {
    expect(activeOverrides(removed.document).map(({ id }) => id)).toEqual([SECOND]);
    expect(overrideRules(removed.document)).toHaveLength(1);
  });

  test('refuses editing or removing it again', () => {
    expect(overrideProblem(removed.document, remove)).toBe(OverrideProblem.Unknown);
  });
});

describe('overrideProblem', () => {
  test('refuses an edit or removal of an override the character does not have', () => {
    const patch: CharacterPatch = { field: CharacterPatchField.RemoveOverride, id: SECOND, reason: ADJUST.reason };

    expect(overrideProblem(added(blank, ADJUST, FIRST).document, patch)).toBe(OverrideProblem.Unknown);
  });

  test('allows an add', () => {
    const patch: CharacterPatch = { field: CharacterPatchField.AddOverride, override: ADJUST };

    expect(overrideProblem(blank.document, patch)).toBeUndefined();
  });
});

describe('an override target', () => {
  test('is any selector', () => {
    expect(Selector.parse('skill:stealth')).toBe(OverrideInput.parse({ ...SET, target: 'skill:stealth' }).target);
  });
});
