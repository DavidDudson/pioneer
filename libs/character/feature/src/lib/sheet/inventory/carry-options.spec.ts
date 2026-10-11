import { CarryState, HANDS_MAX, ONE_HAND } from '@pioneer/character/domain';
import type { ItemEntry } from '@pioneer/character/domain';
import { ItemFixture, itemFixtureContent, itemFixtureId } from '@pioneer/character/domain/testing';
import { describe, expect, it } from 'vitest';

import { CarryChoice, carryChoices, carryOf, choiceOf } from './carry-options';

const content = itemFixtureContent();

function entry(name: ItemFixture): ItemEntry | undefined {
  return content.get(itemFixtureId(name));
}

describe(carryChoices, () => {
  it('offers wearing armour and worn items, and every way to hold, stow or drop', () => {
    expect(carryChoices(entry(ItemFixture.LeatherArmor))).toStrictEqual(Object.values(CarryChoice));
  });

  it('offers no wearing for a weapon, and no one hand for a two-handed one', () => {
    expect(carryChoices(entry(ItemFixture.Greatsword))).toStrictEqual([
      CarryChoice.TwoHands,
      CarryChoice.Stowed,
      CarryChoice.Dropped,
    ]);
  });

  it('offers no wearing for content that is gone', () => {
    expect(carryChoices(undefined)).not.toContain(CarryChoice.Worn);
  });
});

describe(choiceOf, () => {
  it.each(Object.values(CarryChoice))('round-trips %s through its carry', (choice) => {
    expect(choiceOf(carryOf(choice))).toBe(choice);
  });

  it('tells one hand from two', () => {
    expect(choiceOf({ state: CarryState.Held, hands: ONE_HAND })).toBe(CarryChoice.OneHand);
    expect(choiceOf({ state: CarryState.Held, hands: HANDS_MAX })).toBe(CarryChoice.TwoHands);
  });
});
