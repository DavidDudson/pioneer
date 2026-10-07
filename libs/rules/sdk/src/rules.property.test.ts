import { describe, expect, test } from 'bun:test';

import { fakeSeeded } from '@pioneer/shared/kernel/testing';
import { assert, constantFrom, integer, nat, property } from 'fast-check';

import { AncestryDefinition } from './ancestry';
import { Attribute, AttributeModifierSchema, AttributeModifiers } from './attribute';
import { SlugSchema } from './content-id';
import { installRulesFakes } from './testing';

installRulesFakes();

const attribute = constantFrom(...Object.values(Attribute));
const modifier = integer({ min: -5, max: 7 });

describe('rules SDK (properties)', () => {
  test('faked ancestries are valid (the fakers honour the schemas)', () => {
    assert(
      property(nat(), (seed) => {
        expect(SlugSchema.safeParse(fakeSeeded(SlugSchema, seed)).success).toBe(true);
        expect(AncestryDefinition.safeParse(fakeSeeded(AncestryDefinition, seed)).success).toBe(true);
      }),
    );
  });

  test('AttributeModifiers.with changes exactly one attribute', () => {
    assert(
      property(nat(), attribute, modifier, (seed, target, value) => {
        const before = fakeSeeded(AttributeModifiers.codec, seed);
        const after = before.with(target, value);
        for (const other of Object.values(Attribute)) {
          expect(after.get(other)).toBe(other === target ? value : before.get(other));
        }
      }),
    );
  });

  test('modifiers outside -5..+7 are rejected', () => {
    assert(
      property(integer(), (value) => {
        expect(AttributeModifierSchema.safeParse(value).success).toBe(value >= -5 && value <= 7);
      }),
    );
  });
});
