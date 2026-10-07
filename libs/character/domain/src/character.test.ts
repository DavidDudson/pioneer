import { describe, expect, test } from 'bun:test';

import { Attribute, Proficiency } from '@pioneer/rules/sdk';
import { fixedClock, FixtureNamespace, derivedId } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { Character } from './character';
import { CharacterId } from './character-fields';
import { CharacterPatchField } from './character-patch';
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
    expect(wire.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(wire.attributes).toStrictEqual({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
    const decoded = Character.codec.parse(structuredClone(wire));
    expect(decoded).toBeInstanceOf(Character);
    expect(decoded.name).toBe('Valeros');
  });

  test('apply returns a new instance and leaves the original alone', () => {
    const original = new CharacterBuilder().build();
    const renamed = original.apply({ field: CharacterPatchField.Name, value: 'Seelah' }, later);
    expect(renamed.name).toBe('Seelah');
    expect(renamed.updatedAt.equals(later)).toBe(true);
    expect(original.name).toBe('Valeros');
  });

  test('check modifier is attribute plus proficiency', () => {
    const character = new CharacterBuilder().atLevel(3).withAttribute(Attribute.Strength, 4).build();
    expect(character.checkModifier(Attribute.Strength, Proficiency.Expert)).toBe(4 + 4 + 3);
    expect(character.checkModifier(Attribute.Strength, Proficiency.Untrained)).toBe(4);
  });

  test('rejects out-of-range level', () => {
    expect(() =>
      new CharacterBuilder().build().apply({ field: CharacterPatchField.Level, value: 21 }, later),
    ).toThrow();
  });
});
