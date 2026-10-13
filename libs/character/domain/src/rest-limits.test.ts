import { describe, expect, test } from 'bun:test';

import { Attribute, AttributeModifier, AttributeModifiers, HitPoints, Level } from '@pioneer/rules/sdk';

import { restHealing } from './rest-limits';

function healing(constitution: number, level: number): HitPoints {
  return restHealing({
    attributes: AttributeModifiers.none.with(Attribute.Constitution, AttributeModifier.parse(constitution)),
    level: Level.parse(level),
  });
}

describe('restHealing', () => {
  test('is the Constitution modifier times level', () => {
    expect(healing(3, 5)).toBe(HitPoints.parse(15));
  });

  test.each([0, -1])('heals at least 1 per level at a Constitution modifier of %d', (constitution) => {
    expect(healing(constitution, 4)).toBe(HitPoints.parse(4));
  });
});
