import { describe, expect, test } from 'bun:test';

import { ConditionValue, ContentId, FocusPoints, HitPoints, Slug, SpellRank } from '@pioneer/rules/sdk';

import { ConditionInstanceId, ConditionDurationKind } from './conditions';
import type { ActiveCondition } from './conditions';
import { abilityUseKey, Boundary, slotCountKey } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { Doomed, Dying, Wounded } from './death-track';
import { InventoryItemId } from './inventory';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayLimits, PlayState } from './play-state';
import { Resource, resourceMaxima, ResourceCount } from './resources';
import { preparedDaily, refocused, rested, sessionStarted } from './rest-actions';
import { RestChangeKind } from './rest-types';
import { NO_STAFF, StaffProblem, staffProblem } from './staff-limits';
import type { StaffLimits } from './staff-limits';

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
  staff: NO_STAFF,
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
  test('lowers 3 hero points to 1 and gives back session uses', () => {
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

  test('lowers 3 hero points to 1', () => {
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

describe('daily preparations with a staff', () => {
  const STAFF = InventoryItemId.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const OTHER = InventoryItemId.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  const WIZARD = Slug.parse('wizard');
  const STAFF_LIMITS: StaffLimits = {
    staves: new Set([STAFF, OTHER]),
    highestRank: SpellRank.parse(3),
    expendable: new Set([SLOT]),
  };
  const limits: PlayLimits = { ...LIMITS, staff: STAFF_LIMITS };
  const slot = { entry: WIZARD, rank: SpellRank.parse(1) };

  test('gives the staff charges equal to the highest spell rank', () => {
    const { play, changes } = preparedDaily(FRESH_PLAY, limits, { staff: STAFF });
    expect(play.resources.staff).toStrictEqual({ [STAFF]: { max: count(3), spent: count(0) } });
    expect(changes).toStrictEqual([{ kind: RestChangeKind.StaffCharges, item: STAFF, charges: count(3) }]);
  });

  test('adds the rank of an expended slot, which counts as used', () => {
    const { play, changes } = preparedDaily(FRESH_PLAY, limits, { staff: STAFF, slot });
    expect(play.resources.staff[STAFF]?.max).toBe(count(4));
    expect(play.resources.slots[SLOT]).toBe(count(1));
    expect(changes).toStrictEqual([
      { kind: RestChangeKind.StaffCharges, item: STAFF, charges: count(4) },
      { kind: RestChangeKind.SlotExpended, key: SLOT },
    ]);
  });

  test('expends a slot that daily preparations gave back, not one still spent', () => {
    const spent = played({ resources: { ...FRESH_PLAY.resources, slots: { [SLOT]: count(3) } } });
    const { play } = preparedDaily(spent, limits, { staff: STAFF, slot });
    expect(play.resources.slots[SLOT]).toBe(count(1));
  });

  test('prepares only one staff: another clears the first one charges', () => {
    const first = preparedDaily(FRESH_PLAY, limits, { staff: STAFF }).play;
    const { play } = preparedDaily(first, limits, { staff: OTHER });
    expect(Object.keys(play.resources.staff)).toStrictEqual([OTHER]);
  });

  test('loses the charges left when no staff is chosen', () => {
    const first = preparedDaily(FRESH_PLAY, limits, { staff: STAFF }).play;
    expect(preparedDaily(first, limits).play.resources.staff).toStrictEqual({});
  });

  test('gives no charges without spellcasting, or for an item that is no staff', () => {
    const none: PlayLimits = { ...limits, staff: { ...STAFF_LIMITS, highestRank: undefined } };
    expect(preparedDaily(FRESH_PLAY, none, { staff: STAFF }).play.resources.staff).toStrictEqual({});
    expect(preparedDaily(FRESH_PLAY, LIMITS, { staff: STAFF }).play.resources.staff).toStrictEqual({});
  });

  test('ignores a slot that is not expendable', () => {
    const none: PlayLimits = { ...limits, staff: { ...STAFF_LIMITS, expendable: new Set() } };
    const { play } = preparedDaily(FRESH_PLAY, none, { staff: STAFF, slot });
    expect(play.resources.staff[STAFF]?.max).toBe(count(3));
    expect(play.resources.slots).toStrictEqual({});
  });

  test('runs through the command with the staff and slot it names', () => {
    const play = applyPlayCommand(
      FRESH_PLAY,
      { field: PlayCommandField.DailyPreparations, staff: STAFF, slot },
      limits,
    );
    expect(play.resources.staff[STAFF]?.max).toBe(count(4));
  });

  test('refuses a staff that is not one, and a slot that is not expendable or has no staff', () => {
    expect(staffProblem({ staff: STAFF, slot }, STAFF_LIMITS)).toBeUndefined();
    expect(staffProblem({}, STAFF_LIMITS)).toBeUndefined();
    expect(staffProblem({ staff: InventoryItemId.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc') }, STAFF_LIMITS)).toBe(
      StaffProblem.NotAStaff,
    );
    expect(staffProblem({ slot }, STAFF_LIMITS)).toBe(StaffProblem.SlotWithoutStaff);
    expect(staffProblem({ staff: STAFF, slot }, NO_STAFF)).toBe(StaffProblem.NotAStaff);
    expect(staffProblem({ staff: STAFF, slot }, { ...STAFF_LIMITS, expendable: new Set() })).toBe(
      StaffProblem.SlotNotExpendable,
    );
  });
});
