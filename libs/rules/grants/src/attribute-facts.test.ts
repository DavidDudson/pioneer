import { describe, expect, test } from 'bun:test';

import { AttributeModifier, AttributeModifiers, AttributeModifiersWire } from '@pioneer/rules/sdk';
import type { Attribute } from '@pioneer/rules/sdk';
import { assert, integer, property, record } from 'fast-check';

import { resolveGrants } from './resolve-grants';
import { entry, grantOf, inputsOf, picked } from './testing/builders';

const MOD_MIN = -5;
const MOD_MAX = 7;

function modifiers(wire: Record<Attribute, number>): AttributeModifiers {
  const parsed = Object.fromEntries(
    Object.entries(wire).map(([name, value]) => [name, AttributeModifier.parse(value)]),
  );
  return new AttributeModifiers(AttributeModifiersWire.parse(parsed));
}

const STRONG = modifiers({ str: 3, dex: 1, con: 0, int: -1, wis: 2, cha: 0 });

/** The character's `attribute:` options with `attributes` on it. */
function attributeOptionsOf(attributes: AttributeModifiers | undefined): readonly string[] {
  const inputs = { ...inputsOf({ entries: [], roots: [] }), attributes };
  return resolveGrants(inputs)
    .rollOptions.map(String)
    .filter((option: string) => option.startsWith('attribute:'));
}

describe('the attribute facts', () => {
  test('are each modifier, as Foundry writes it', () => {
    expect(attributeOptionsOf(STRONG)).toEqual([
      'attribute:cha:mod:0',
      'attribute:con:mod:0',
      'attribute:dex:mod:1',
      'attribute:str:mod:3',
      'attribute:wis:mod:2',
    ]);
  });

  test('set nothing for a negative modifier, which a roll option cannot hold', () => {
    expect(attributeOptionsOf(STRONG)).not.toContain('attribute:int:mod:-1');
  });

  test('are none without attribute modifiers', () => {
    expect(attributeOptionsOf(undefined)).toEqual([]);
  });

  test('are what a grant predicate reads', () => {
    const feature = entry('brute-force', [{ ...grantOf('trained'), predicate: [{ gte: ['attribute:str:mod', 3] }] }]);
    const trained = entry('trained');
    const items = (attributes: AttributeModifiers | undefined): readonly string[] =>
      resolveGrants({
        ...inputsOf({ entries: [feature, trained], roots: [picked('brute-force')] }),
        attributes,
      }).items.map(({ entry: each }) => each.slug);

    expect(items(STRONG)).toContain('trained');
    expect(items(modifiers({ str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }))).not.toContain('trained');
  });

  test('match the modifiers they come from', () => {
    const arbitrary = record({
      str: integer({ min: MOD_MIN, max: MOD_MAX }),
      dex: integer({ min: MOD_MIN, max: MOD_MAX }),
      con: integer({ min: MOD_MIN, max: MOD_MAX }),
      int: integer({ min: MOD_MIN, max: MOD_MAX }),
      wis: integer({ min: MOD_MIN, max: MOD_MAX }),
      cha: integer({ min: MOD_MIN, max: MOD_MAX }),
    });
    assert(
      property(arbitrary, (wire) => {
        const expected = Object.entries(wire)
          .filter(([, value]) => value >= 0)
          .map(([name, value]) => `attribute:${name}:mod:${value}`)
          .toSorted();
        expect(attributeOptionsOf(modifiers(wire))).toEqual(expected);
      }),
    );
  });
});
