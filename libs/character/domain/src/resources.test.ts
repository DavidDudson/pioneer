import { describe, expect, test } from 'bun:test';

import { FocusPoints, HitPoints } from '@pioneer/rules/sdk';

import { Dying, Wounded } from './death-track';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { currentResource, HERO_POINTS_MAX, NO_RESOURCES, Resource, ResourceCount, resourceMaxima } from './resources';
import type { ResourceMaxima } from './resources';
import { within } from './testing';

const HP = HitPoints.parse(20);
const MAXIMA: ResourceMaxima = {
  [Resource.HeroPoints]: ResourceCount.parse(HERO_POINTS_MAX),
  [Resource.FocusPoints]: ResourceCount.parse(2),
};
const LIMITS = within(HP, MAXIMA);

function points(value: number): ResourceCount {
  return ResourceCount.parse(value);
}

function held(play: PlayState, resource: Resource): number {
  return currentResource(play.resources, resource, MAXIMA);
}

function dyingWith(spent: number): PlayState {
  return {
    ...FRESH_PLAY,
    dying: Dying.parse(2),
    wounded: Wounded.parse(1),
    resources: { ...FRESH_PLAY.resources, [Resource.HeroPoints]: points(spent) },
  };
}

describe('resource maxima', () => {
  test('hero points top out at 3 and the focus pool is what the focus spells give', () => {
    expect(resourceMaxima(FocusPoints.parse(0))).toStrictEqual({ ...NO_RESOURCES, [Resource.HeroPoints]: points(3) });
    expect(resourceMaxima(FocusPoints.parse(2))).toStrictEqual(MAXIMA);
  });

  test('a character with no play state yet holds every point', () => {
    expect(held(FRESH_PLAY, Resource.HeroPoints)).toBe(3);
    expect(held(FRESH_PLAY, Resource.FocusPoints)).toBe(2);
  });
});

describe('spend, regain and set a resource', () => {
  test('spending lowers the points held, and stops at 0', () => {
    const one = applyPlayCommand(
      FRESH_PLAY,
      { field: PlayCommandField.SpendResource, resource: Resource.FocusPoints, amount: points(1) },
      LIMITS,
    );
    expect(held(one, Resource.FocusPoints)).toBe(1);
    const past = applyPlayCommand(
      one,
      { field: PlayCommandField.SpendResource, resource: Resource.FocusPoints, amount: points(5) },
      LIMITS,
    );
    expect(held(past, Resource.FocusPoints)).toBe(0);
  });

  test('regaining raises the points held, and stops at the maximum', () => {
    const spent = applyPlayCommand(
      FRESH_PLAY,
      { field: PlayCommandField.SetResource, resource: Resource.HeroPoints, current: points(0) },
      LIMITS,
    );
    const two = applyPlayCommand(
      spent,
      { field: PlayCommandField.RegainResource, resource: Resource.HeroPoints, amount: points(2) },
      LIMITS,
    );
    expect(held(two, Resource.HeroPoints)).toBe(2);
    const over = applyPlayCommand(
      two,
      { field: PlayCommandField.RegainResource, resource: Resource.HeroPoints, amount: points(9) },
      LIMITS,
    );
    expect(held(over, Resource.HeroPoints)).toBe(3);
  });

  test('setting holds the value within 0 and the maximum', () => {
    const set = applyPlayCommand(
      FRESH_PLAY,
      { field: PlayCommandField.SetResource, resource: Resource.FocusPoints, current: points(9) },
      LIMITS,
    );
    expect(held(set, Resource.FocusPoints)).toBe(2);
    expect(set.resources[Resource.FocusPoints]).toBe(points(0));
  });

  test('a pool keeps what was spent when its maximum grows', () => {
    const spent = applyPlayCommand(
      FRESH_PLAY,
      { field: PlayCommandField.SpendResource, resource: Resource.FocusPoints, amount: points(1) },
      LIMITS,
    );
    const grown = { ...MAXIMA, [Resource.FocusPoints]: points(3) };
    expect(currentResource(spent.resources, Resource.FocusPoints, grown)).toBe(points(2));
  });

  test('a pool with no maximum holds nothing, and spending it changes nothing', () => {
    const after = applyPlayCommand(
      FRESH_PLAY,
      { field: PlayCommandField.SpendResource, resource: Resource.FocusPoints, amount: points(1) },
      within(HP),
    );
    expect(after).toStrictEqual(FRESH_PLAY);
  });
});

describe('Heroic Recovery', () => {
  const spendAll = {
    field: PlayCommandField.SpendResource,
    resource: Resource.HeroPoints,
    amount: points(3),
  } as const;

  test('spending every hero point while dying ends dying and leaves wounded as it is', () => {
    const after = applyPlayCommand(dyingWith(0), spendAll, LIMITS);
    expect(held(after, Resource.HeroPoints)).toBe(0);
    expect(after.dying).toBe(Dying.parse(0));
    expect(after.wounded).toBe(Wounded.parse(1));
    expect(after.dead).toBe(false);
  });

  test('spending the last of what remains counts', () => {
    const after = applyPlayCommand(
      dyingWith(2),
      { field: PlayCommandField.SpendResource, resource: Resource.HeroPoints, amount: points(1) },
      LIMITS,
    );
    expect(after.dying).toBe(Dying.parse(0));
  });

  test('spending only some hero points leaves dying', () => {
    const after = applyPlayCommand(
      dyingWith(0),
      { field: PlayCommandField.SpendResource, resource: Resource.HeroPoints, amount: points(2) },
      LIMITS,
    );
    expect(after.dying).toBe(Dying.parse(2));
    expect(held(after, Resource.HeroPoints)).toBe(1);
  });

  test('a character with no hero points left has nothing to spend', () => {
    const after = applyPlayCommand(dyingWith(3), spendAll, LIMITS);
    expect(after.dying).toBe(Dying.parse(2));
  });

  test('a character who is not dying just spends them', () => {
    const after = applyPlayCommand(FRESH_PLAY, spendAll, LIMITS);
    expect(held(after, Resource.HeroPoints)).toBe(0);
    expect(after.dying).toBe(Dying.parse(0));
    expect(after.wounded).toBe(Wounded.parse(0));
  });

  test('a dead character stays dead', () => {
    const dead: PlayState = { ...dyingWith(0), dying: Dying.parse(4), dead: true };
    const after = applyPlayCommand(dead, spendAll, LIMITS);
    expect(after.dead).toBe(true);
    expect(after.dying).toBe(Dying.parse(4));
  });

  test('setting hero points to 0 is a correction, not Heroic Recovery', () => {
    const after = applyPlayCommand(
      dyingWith(0),
      { field: PlayCommandField.SetResource, resource: Resource.HeroPoints, current: points(0) },
      LIMITS,
    );
    expect(after.dying).toBe(Dying.parse(2));
  });
});
