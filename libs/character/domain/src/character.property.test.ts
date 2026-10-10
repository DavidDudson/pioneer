import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { fakeSeeded } from '@pioneer/shared/kernel/testing';
import { assert, nat, property } from 'fast-check';
import * as z from 'zod';

import { Character } from './character';
import { CharacterPatchSchema } from './character-patch';
import { CharacterBuilder } from './testing';

installRulesFakes();
const later = fixedClock('2030-01-01T00:00:00Z').now();
const character = nat().map((seed) => CharacterBuilder.random(seed).build());
const patch = nat().map((seed) => fakeSeeded(CharacterPatchSchema, seed));

describe('Character (properties)', () => {
  test('codec round-trip: decode(encode(c)) re-encodes identically', () => {
    assert(
      property(character, (original) => {
        const wire = z.encode(Character.codec, original);
        const decoded = Character.codec.parse(structuredClone(wire));
        expect(decoded).toBeInstanceOf(Character);
        expect(z.encode(Character.codec, decoded)).toStrictEqual(wire);
      }),
    );
  });

  test('apply keeps identity, version and creation time, and stays valid', () => {
    assert(
      property(character, patch, (original, edit) => {
        const next = original.apply(edit, later);
        expect(next.id).toBe(original.id);
        expect(next.version).toBe(original.version);
        expect(next.createdAt.equals(original.createdAt)).toBe(true);
        expect(next.updatedAt.equals(later)).toBe(true);
        expect(Character.codec.safeParse(z.encode(Character.codec, next)).success).toBe(true);
      }),
    );
  });

  test('random(seed) is reproducible', () => {
    assert(
      property(nat(), (seed) => {
        expect(z.encode(Character.codec, CharacterBuilder.random(seed).build())).toStrictEqual(
          z.encode(Character.codec, CharacterBuilder.random(seed).build()),
        );
      }),
    );
  });
});
