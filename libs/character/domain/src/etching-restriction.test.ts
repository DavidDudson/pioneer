import { describe, expect, test } from 'bun:test';

import { EtchingRestriction } from '@pioneer/rules/sdk';

import { meetsRestriction } from './etching-restriction';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

const content = itemFixtureContent();

function meets(item: ItemFixture, restriction: string): boolean {
  return meetsRestriction(content.get(itemFixtureId(item)), EtchingRestriction.parse(restriction));
}

describe('meetsRestriction', () => {
  test('melee and slashing melee runes go on a longsword, not a shortbow', () => {
    expect(meets(ItemFixture.Longsword, 'melee')).toBe(true);
    expect(meets(ItemFixture.Longsword, 'slashing-melee')).toBe(true);
    expect(meets(ItemFixture.Shortbow, 'melee')).toBe(false);
    expect(meets(ItemFixture.Shortbow, 'piercing-or-slashing-melee')).toBe(false);
  });

  test('damage-type runes read the damage a weapon deals', () => {
    expect(meets(ItemFixture.Shortbow, 'piercing-or-slashing')).toBe(true);
    expect(meets(ItemFixture.Longsword, 'bludgeoning')).toBe(false);
  });

  test('a thrown rune needs the thrown trait', () => {
    expect(meets(ItemFixture.Longsword, 'thrown')).toBe(false);
  });

  test('armour runes read the category and whether it is metal', () => {
    expect(meets(ItemFixture.LeatherArmor, 'light')).toBe(true);
    expect(meets(ItemFixture.LeatherArmor, 'medium-or-heavy')).toBe(false);
    expect(meets(ItemFixture.HideArmor, 'medium-or-heavy')).toBe(true);
    expect(meets(ItemFixture.HideArmor, 'metal')).toBe(false);
    expect(meets(ItemFixture.LeatherArmor, 'light-or-medium-nonmetal')).toBe(true);
  });

  test('a restriction with no check is not refused', () => {
    expect(meets(ItemFixture.Longsword, 'holy-weapon')).toBe(true);
  });
});
