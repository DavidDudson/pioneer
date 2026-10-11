import { describe, expect, test } from 'bun:test';

import { AncestryId, ChoiceValue, contentId, EntrySlug, PackId, SlotKey } from '@pioneer/rules/sdk';
import { fixedClock, FixtureNamespace, derivedId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Character } from './character';
import { CharacterId, CharacterLevel, CharacterName } from './character-fields';
import { CharacterPatchField, CharacterPatchSchema } from './character-patch';
import { ANCESTRY_SLOT } from './character-slots';
import { CharacterBuilder, humanAncestryId } from './testing';

const later = fixedClock('2026-10-07T10:00:00Z').now();
const featSlot = SlotKey.parse('feat:class:2');

describe('Character', () => {
  test('builder ids are UUIDv5 of the name, so fixtures are stable', () => {
    const valeros = new CharacterBuilder().named('Valeros').build();
    expect(valeros.id).toBe(CharacterId.parse(derivedId(FixtureNamespace, 'character:Valeros')));
    expect(new CharacterBuilder().named('Valeros').build().id).toBe(valeros.id);
  });

  test('codec round-trips to wire JSON and back to a class', () => {
    const wire = z.encode(Character.codec, new CharacterBuilder().build());
    expect(wire.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(wire).not.toHaveProperty('attributes');
    const decoded = Character.codec.parse(structuredClone(wire));
    expect(decoded).toBeInstanceOf(Character);
    expect(decoded.name).toBe(CharacterName.parse('Valeros'));
  });

  test('apply returns a new instance and leaves the original alone', () => {
    const original = new CharacterBuilder().build();
    const renamed = original.apply({ field: CharacterPatchField.Name, value: CharacterName.parse('Seelah') }, later);
    expect(renamed.name).toBe(CharacterName.parse('Seelah'));
    expect(renamed.updatedAt.equals(later)).toBe(true);
    expect(original.name).toBe(CharacterName.parse('Valeros'));
  });

  test('stores its ancestry and boosts as slot selections, and nothing derived', () => {
    const valeros = new CharacterBuilder().picking('boost:1:free:0', 'str').build();
    expect(Object.entries(valeros.document.build.choices)).toStrictEqual([
      ['ancestry', ChoiceValue.parse(humanAncestryId)],
      ['boost:1:free:0', ChoiceValue.parse('str')],
    ]);
    expect(valeros.document).not.toHaveProperty('attributes');
    expect(valeros.ancestry).toBe(humanAncestryId);
  });

  test('selecting a slot replaces its selection and keeps every other pick', () => {
    const planned = ChoiceValue.parse('sudden-charge');
    const original = new CharacterBuilder().build();
    const withPlan = new Character({
      document: {
        ...original.document,
        build: { ...original.document.build, choices: { ...original.document.build.choices, [featSlot]: planned } },
      },
      version: original.version,
      createdAt: original.createdAt,
      updatedAt: original.updatedAt,
    });
    const elf = AncestryId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf')));
    const changed = withPlan.apply(
      { field: CharacterPatchField.SelectSlot, slot: ANCESTRY_SLOT, selection: ChoiceValue.parse(elf) },
      later,
    );
    expect(changed.ancestry).toBe(elf);
    expect(changed.document.build.choices[featSlot]).toBe(planned);
    expect(z.encode(Character.codec, changed).build?.choices).toStrictEqual({ ancestry: elf, [featSlot]: planned });
  });

  test('clearing a slot drops its selection and keeps every other pick, hidden ones included', () => {
    const planned = ChoiceValue.parse('sudden-charge');
    const original = new CharacterBuilder().build();
    const selected = original.apply(
      { field: CharacterPatchField.SelectSlot, slot: featSlot, selection: planned },
      later,
    );
    const cleared = selected.apply({ field: CharacterPatchField.ClearSlot, slot: ANCESTRY_SLOT }, later);
    expect(cleared.ancestry).toBeUndefined();
    expect(cleared.document.build.choices).toStrictEqual({ [featSlot]: planned });
  });

  test('levelling down keeps a selection for a slot only a higher level has', () => {
    const planned = ChoiceValue.parse('sudden-charge');
    const original = new CharacterBuilder().build();
    const selected = original.apply(
      { field: CharacterPatchField.SelectSlot, slot: featSlot, selection: planned },
      later,
    );
    const levelled = selected.apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(1) }, later);
    expect(levelled.document.build.choices[featSlot]).toBe(planned);
  });

  test('an empty ancestry slot reads as no ancestry', () => {
    const original = new CharacterBuilder().build();
    const unpicked = new Character({
      document: { ...original.document, build: { choices: {}, boons: [] } },
      version: original.version,
      createdAt: original.createdAt,
      updatedAt: original.updatedAt,
    });
    expect(unpicked.ancestry).toBeUndefined();
  });

  test('rejects out-of-range level', () => {
    expect(CharacterPatchSchema.safeParse({ field: CharacterPatchField.Level, value: 21 }).success).toBe(false);
  });
});
