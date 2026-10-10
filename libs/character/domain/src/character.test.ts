import { describe, expect, test } from 'bun:test';

import { fixedClock, FixtureNamespace, derivedId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Character } from './character';
import { CharacterId, CharacterName } from './character-fields';
import { CharacterPatchField, CharacterPatchSchema } from './character-patch';
import { CharacterBuilder } from './testing';

const later = fixedClock('2026-10-07T10:00:00Z').now();

describe('Character', () => {
  test('builder ids are UUIDv5 of the name, so fixtures are stable', () => {
    const valeros = new CharacterBuilder().named('Valeros').build();
    expect(valeros.id).toBe(CharacterId.parse(derivedId(FixtureNamespace, 'character:Valeros')));
    expect(new CharacterBuilder().named('Valeros').build().id).toBe(valeros.id);
  });

  test('codec round-trips to wire JSON and back to a class', () => {
    const wire = z.encode(Character.codec, new CharacterBuilder().build());
    expect(wire.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(wire.attributes).toStrictEqual({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
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

  test('rejects out-of-range level', () => {
    expect(CharacterPatchSchema.safeParse({ field: CharacterPatchField.Level, value: 21 }).success).toBe(false);
  });
});
