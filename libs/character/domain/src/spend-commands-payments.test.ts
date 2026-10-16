import { describe, expect, test } from 'bun:test';

import { HitPoints, Slug, SpellRank } from '@pioneer/rules/sdk';

import { Boundary, slotCountKey } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { InventoryItemId } from './inventory';
import { applyPlayCommand, PlayCommandField } from './play-state';
import type { PlayCommand, PlayLimits, PlayState } from './play-state';
import { ResourceCount } from './resource-count';
import { Resource } from './resources';
import { spendRefusal, spentStaffOf } from './spend-commands';
import { SpendCommandField, SpendProblem } from './spend-log';
import type { SpendCommand } from './spend-log';
import { ACTION, actions, OWN_TURN, playIn, Serial, spendId, spendOf, turnOf } from './spend-log-testing';
import { StaffCommandField } from './staff-commands';
import { NO_STAFF } from './staff-limits';
import { TEST_SPEND, within } from './testing';
import { ActionCount, TurnPhase } from './turn-state';

const NONE = ResourceCount.parse(0);
const ONE = ResourceCount.parse(1);
const FIRST = Serial.parse(1);
const SECOND = Serial.parse(2);
const ONE_ACTION = actions(1);
const NO_SLOTS: CountedMaxima = { slots: new Map(), uses: new Map() };
const LIMITS: PlayLimits = { ...within(HitPoints.parse(10)), counted: NO_SLOTS, spend: TEST_SPEND };

function undo(serial: Serial): PlayCommand {
  return { field: PlayCommandField.UndoSpend, id: spendId(serial) };
}

/** The first spend, which also pays `extra`. */
function pays(extra: object): PlayCommand {
  return { ...spendOf(FIRST, ONE_ACTION), ...extra };
}

describe('a spend that records a staff cast', () => {
  const STAFF = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
  const SLOT = slotCountKey(Slug.parse('sorcerer'), undefined, SpellRank.parse(1));
  const CAST = { item: STAFF, spell: ACTION, slot: SLOT };
  const CHARGES = ResourceCount.parse(2);
  const staffLimits: PlayLimits = {
    ...LIMITS,
    counted: { ...NO_SLOTS, slots: new Map([[SLOT, { max: ResourceCount.parse(1), boundary: Boundary.Day }]]) },
    staff: { ...NO_STAFF, castCost: CHARGES },
  };
  const staffPlay = (): PlayState => {
    const play = playIn(OWN_TURN);
    return {
      ...play,
      resources: { ...play.resources, staff: { [STAFF]: { max: ResourceCount.parse(4), spent: NONE } } },
    };
  };
  const cast = { ...spendOf(FIRST, ONE_ACTION), staff: CAST };

  test('pays the staff charges and the slot, and logs the cast with the spend', () => {
    const play = applyPlayCommand(staffPlay(), cast, staffLimits);
    expect(play.resources.staff[STAFF]?.spent).toBe(CHARGES);
    expect(play.resources.slots[SLOT]).toBe(ResourceCount.parse(1));
    expect(play.turn.actions).toBe(ActionCount.parse(2));
    expect(play.spendLog[0]?.staff).toStrictEqual(CAST);
  });

  test('gives the charges, the slot and the action back when the spend is undone', () => {
    const spent = applyPlayCommand(staffPlay(), cast, staffLimits);
    const play = applyPlayCommand(spent, undo(FIRST), staffLimits);
    expect(play.resources.staff[STAFF]?.spent).toBe(NONE);
    expect(play.resources.slots[SLOT]).toBe(NONE);
    expect(play.turn.actions).toBe(ActionCount.parse(3));
    expect(play.spendLog).toHaveLength(0);
  });

  test('leaves the staff alone when the turn refuses the spend', () => {
    const off = playIn(turnOf(TurnPhase.OffTurn, 0));
    const refused = applyPlayCommand({ ...staffPlay(), turn: off.turn }, cast, staffLimits);
    expect(refused.resources.staff[STAFF]?.spent).toBe(NONE);
    expect(refused.spendLog).toHaveLength(0);
  });

  test('refuses a staff cast that also expends a slot or a Focus Point, so it never pays twice', () => {
    const limits = {
      counted: staffLimits.counted,
      points: { [Resource.HeroPoints]: ONE, [Resource.FocusPoints]: ONE },
    };
    const twice: SpendCommand = { ...cast, field: SpendCommandField.SpendAction };
    expect(spendRefusal(staffPlay(), { ...twice, slot: SLOT }, limits)).toBe(SpendProblem.PaymentConflict);
    expect(spendRefusal(staffPlay(), { ...twice, focus: true }, limits)).toBe(SpendProblem.PaymentConflict);
    expect(spendRefusal(staffPlay(), twice, limits)).toBeUndefined();
  });

  test('names the staff cast a spend makes and the one its undoing takes back', () => {
    const spent = applyPlayCommand(staffPlay(), cast, staffLimits);
    expect(spentStaffOf(spent, cast)).toStrictEqual({ field: StaffCommandField.CastStaff, ...CAST });
    expect(spentStaffOf(spent, undo(FIRST) as SpendCommand)).toStrictEqual({
      field: StaffCommandField.UncastStaff,
      ...CAST,
    });
    expect(spentStaffOf(spent, spendOf(SECOND, ONE_ACTION))).toBeUndefined();
  });
});

describe('a spend that expends a slot or a Focus Point', () => {
  const SLOT = slotCountKey(Slug.parse('wizard'), undefined, SpellRank.parse(1));
  const withSlots: PlayLimits = {
    ...LIMITS,
    counted: { ...NO_SLOTS, slots: new Map([[SLOT, { max: ONE, boundary: Boundary.Day }]]) },
    resources: { ...LIMITS.resources, 'focus-points': ONE },
  };

  test('expends the slot and gives it back when the spend is undone', () => {
    const spent = applyPlayCommand(playIn(OWN_TURN), pays({ slot: SLOT }), withSlots);
    expect(spent.resources.slots[SLOT]).toBe(ONE);
    const undone = applyPlayCommand(spent, undo(FIRST), withSlots);
    expect(undone.resources.slots[SLOT]).toBe(NONE);
  });

  test('spends a Focus Point and regains it when the spend is undone', () => {
    const spent = applyPlayCommand(playIn(OWN_TURN), pays({ focus: true }), withSlots);
    expect(spent.resources['focus-points']).toBe(ONE);
    const undone = applyPlayCommand(spent, undo(FIRST), withSlots);
    expect(undone.resources['focus-points']).toBe(NONE);
  });

  test('refuses a slot with none left and a Focus Point with none held', () => {
    const play = playIn(OWN_TURN);
    const none = { counted: NO_SLOTS, points: LIMITS.resources };
    const slotted = spendRefusal(play, pays({ slot: SLOT }) as SpendCommand, none);
    const focused = spendRefusal(play, pays({ focus: true }) as SpendCommand, none);
    expect(slotted).toBe(SpendProblem.NoSlotLeft);
    expect(focused).toBe(SpendProblem.NoFocusLeft);
  });

  test('leaves the turn as it was when the slot is gone', () => {
    const spent = applyPlayCommand(playIn(OWN_TURN), pays({ slot: SLOT }), withSlots);
    const second = { ...pays({ slot: SLOT }), id: spendId(SECOND) } as PlayCommand;
    const refused = applyPlayCommand(spent, second, withSlots);
    expect(refused.spendLog).toHaveLength(1);
    expect(refused.turn.actions).toBe(spent.turn.actions);
  });
});
