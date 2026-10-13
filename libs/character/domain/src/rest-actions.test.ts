import { describe, expect, test } from 'bun:test';

import { ConditionValue, ContentId, FocusPoints, HitPoints, Slug, SpellRank } from '@pioneer/rules/sdk';

import { ConditionInstanceId, ConditionDurationKind } from './conditions';
import type { ActiveCondition } from './conditions';
import { abilityUseKey, Boundary, slotCountKey } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { Doomed, Dying, Wounded } from './death-track';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayLimits, PlayState } from './play-state';
import { Resource, resourceMaxima, ResourceCount } from './resources';
import { preparedDaily, refocused, rested, sessionStarted } from './rest-actions';
import { RestChangeKind } from './rest-types';

function count(value: number): ResourceCount {
  return ResourceCount.parse(value);
}

function hp(value: number): HitPoints {
  return HitPoints.parse(value);
}

const FATIGUED = ContentId.parse('00000000-0000-4000-8000-0000000000f1');
const DRAINED = ContentId.parse('00000000-0000-4000-8000-0000000000d1');
const FRIGHTENED = ContentId.parse('00000000-0000-4000-8000-0000000000e1');
const DAILY_USE = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-000000000001'));
const HOURLY_USE = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-000000000002'));
const SESSION_USE = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-000000000003'));
const SLOT = slotCountKey(Slug.parse('wizard'), undefined, SpellRank.parse(1));

const COUNTED: CountedMaxima = {
  slots: new Map([[SLOT, { max: count(3), boundary: Boundary.Day }]]),
  uses: new Map([
    [DAILY_USE, { max: count(2), boundary: Boundary.Day }],
    [HOURLY_USE, { max: count(1), boundary: Boundary.Rest }],
    [SESSION_USE, { max: count(1), boundary: Boundary.Session }],
  ]),
};

const LIMITS: PlayLimits = {
  hitPoints: hp(40),
  healing: hp(10),
  recovery: { fatigued: FATIGUED, drained: DRAINED },
  resources: resourceMaxima(FocusPoints.parse(2)),
  counted: COUNTED,
  valued: new Map(),
};

const FIRST = ConditionInstanceId.parse('11111111-1111-4111-8111-111111111111');
const SECOND = ConditionInstanceId.parse('22222222-2222-4222-8222-222222222222');
const THIRD = ConditionInstanceId.parse('33333333-3333-4333-8333-333333333333');

function condition(id: ConditionInstanceId, content: ContentId, value?: number): ActiveCondition {
  return {
    id,
    condition: content,
    ...(value === undefined ? {} : { value: ConditionValue.parse(value) }),
    duration: { kind: ConditionDurationKind.Unlimited },
  };
}

function played(overrides: Partial<PlayState>): PlayState {
  return { ...FRESH_PLAY, ...overrides };
}

function damaged(damage: number): PlayState {
  return played({ hp: { damage: hp(damage), temp: hp(0) } });
}

describe('rest', () => {
  test('heals the healing amount, never past full', () => {
    const outcome = rested(damaged(25), LIMITS);
    expect(outcome.play.hp.damage).toBe(hp(15));
    expect(outcome.changes).toStrictEqual([{ kind: RestChangeKind.HitPoints, gained: hp(10) }]);
    expect(rested(damaged(4), LIMITS).play.hp.damage).toBe(hp(0));
  });

  test('changes nothing for a character at full Hit Points with nothing to ease', () => {
    const outcome = rested(FRESH_PLAY, LIMITS);
    expect(outcome.play).toBe(FRESH_PLAY);
    expect(outcome.changes).toStrictEqual([]);
  });

  test('brings a character at 0 Hit Points back from dying, wounded', () => {
    const { play } = rested({ ...damaged(40), dying: Dying.parse(1) }, LIMITS);
    expect(play.dying).toBe(Dying.parse(0));
    expect(play.wounded).toBe(Wounded.parse(1));
  });

  test('removes fatigued, lowers drained by 1 and leaves other conditions', () => {
    const tired = played({
      conditions: [condition(FIRST, FATIGUED), condition(SECOND, DRAINED, 2), condition(THIRD, FRIGHTENED, 1)],
    });
    const { play, changes } = rested(tired, LIMITS);
    expect(play.conditions.map(({ condition: id, value }) => [id, value])).toStrictEqual([
      [DRAINED, ConditionValue.parse(1)],
      [FRIGHTENED, ConditionValue.parse(1)],
    ]);
    expect(changes).toStrictEqual([
      { kind: RestChangeKind.ConditionRemoved, condition: FATIGUED },
      { kind: RestChangeKind.ConditionLowered, condition: DRAINED, value: ConditionValue.parse(1) },
    ]);
  });

  test('removes drained at 1', () => {
    const { play } = rested(played({ conditions: [condition(FIRST, DRAINED, 1)] }), LIMITS);
    expect(play.conditions).toStrictEqual([]);
  });

  test('lowers doomed by 1, not below 0', () => {
    const once = rested(played({ doomed: Doomed.parse(1) }), LIMITS);
    expect(once.play.doomed).toBe(Doomed.parse(0));
    expect(rested(once.play, LIMITS).play.doomed).toBe(Doomed.parse(0));
  });

  test('leaves the wounded value alone', () => {
    const { play } = rested(played({ wounded: Wounded.parse(2) }), LIMITS);
    expect(play.wounded).toBe(Wounded.parse(2));
  });
});

describe('daily preparations', () => {
  const spent = played({
    resources: {
      ...FRESH_PLAY.resources,
      [Resource.FocusPoints]: count(2),
      slots: { [SLOT]: count(3) },
      uses: { [DAILY_USE]: count(1), [HOURLY_USE]: count(1), [SESSION_USE]: count(1) },
    },
  });

  test('gives back focus points, day slots and day uses, and nothing on another boundary', () => {
    const { play, changes } = preparedDaily(spent, LIMITS);
    expect(play.resources[Resource.FocusPoints]).toBe(count(0));
    expect(play.resources.slots[SLOT]).toBe(count(0));
    expect(play.resources.uses[DAILY_USE]).toBe(count(0));
    expect(play.resources.uses[HOURLY_USE]).toBe(count(1));
    expect(play.resources.uses[SESSION_USE]).toBe(count(1));
    expect(changes).toStrictEqual([
      { kind: RestChangeKind.Points, resource: Resource.FocusPoints, from: count(0), to: count(2) },
      { kind: RestChangeKind.Slots, key: SLOT, amount: count(3) },
      { kind: RestChangeKind.Uses, key: DAILY_USE, amount: count(1) },
    ]);
  });

  test('changes nothing when nothing is spent', () => {
    expect(preparedDaily(FRESH_PLAY, LIMITS).changes).toStrictEqual([]);
  });
});

describe('refocus', () => {
  test('gives back one focus point', () => {
    const spent = played({ resources: { ...FRESH_PLAY.resources, [Resource.FocusPoints]: count(2) } });
    const { play, changes } = refocused(spent, LIMITS);
    expect(play.resources[Resource.FocusPoints]).toBe(count(1));
    expect(changes).toStrictEqual([
      { kind: RestChangeKind.Points, resource: Resource.FocusPoints, from: count(0), to: count(1) },
    ]);
  });

  test('changes nothing at a full pool', () => {
    expect(refocused(FRESH_PLAY, LIMITS).changes).toStrictEqual([]);
  });
});

describe('start of session', () => {
  test('sets hero points to 1 from either side and gives back session uses', () => {
    const spent = played({
      resources: { ...FRESH_PLAY.resources, [Resource.HeroPoints]: count(3), uses: { [SESSION_USE]: count(1) } },
    });
    const raised = sessionStarted(spent, LIMITS);
    expect(raised.play.resources[Resource.HeroPoints]).toBe(count(2));
    expect(raised.play.resources.uses[SESSION_USE]).toBe(count(0));
    expect(raised.changes).toStrictEqual([
      { kind: RestChangeKind.Points, resource: Resource.HeroPoints, from: count(0), to: count(1) },
      { kind: RestChangeKind.Uses, key: SESSION_USE, amount: count(1) },
    ]);
  });

  test('sets three hero points held back to 1', () => {
    const { play, changes } = sessionStarted(FRESH_PLAY, LIMITS);
    expect(play.resources[Resource.HeroPoints]).toBe(count(2));
    expect(changes).toStrictEqual([
      { kind: RestChangeKind.Points, resource: Resource.HeroPoints, from: count(3), to: count(1) },
    ]);
  });
});

describe('as play commands', () => {
  test('each applies as one edit of the play state', () => {
    const rest = applyPlayCommand(damaged(25), { field: PlayCommandField.Rest }, LIMITS);
    expect(rest.hp.damage).toBe(hp(15));
    const session = applyPlayCommand(FRESH_PLAY, { field: PlayCommandField.StartSession }, LIMITS);
    expect(session.resources[Resource.HeroPoints]).toBe(count(2));
  });
});
