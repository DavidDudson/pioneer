import { describe, expect, test } from 'bun:test';

import { DegreeOfSuccess, HitPoints, ToggleKey } from '@pioneer/rules/sdk';

import { Doomed, Dying, Wounded } from './death-track';
import {
  applyPlayCommand,
  currentHitPoints,
  FRESH_PLAY,
  PlayCommandField,
  PlayStateSchema,
  untypedDamage,
} from './play-state';
import type { PlayState } from './play-state';
import { within } from './testing';

const MAX = HitPoints.parse(20);

function hp(value: number): HitPoints {
  return HitPoints.parse(value);
}

function dyingState(value: number): PlayState {
  return { ...FRESH_PLAY, dying: Dying.parse(value) };
}

function state(damage: number, temp = 0): PlayState {
  return { ...FRESH_PLAY, hp: { damage: hp(damage), temp: hp(temp) } };
}

describe('applyPlayCommand', () => {
  test('a character with no play state yet is at full Hit Points', () => {
    expect(currentHitPoints(FRESH_PLAY.hp, MAX)).toBe(MAX);
  });

  test('damage spends temporary Hit Points first', () => {
    const after = applyPlayCommand(
      state(0, 5),
      { field: PlayCommandField.Damage, damage: untypedDamage(hp(8)) },
      within(MAX),
    );
    expect(after).toStrictEqual(state(3, 0));
  });

  test('damage that temporary Hit Points absorb whole leaves Hit Points alone', () => {
    const after = applyPlayCommand(
      state(2, 5),
      { field: PlayCommandField.Damage, damage: untypedDamage(hp(4)) },
      within(MAX),
    );
    expect(after).toStrictEqual(state(2, 1));
  });

  test('Hit Points stop at 0', () => {
    const after = applyPlayCommand(
      state(15),
      { field: PlayCommandField.Damage, damage: untypedDamage(hp(30)) },
      within(MAX),
    );
    expect(currentHitPoints(after.hp, MAX)).toBe(hp(0));
  });

  test('healing stops at the maximum', () => {
    const after = applyPlayCommand(state(4), { field: PlayCommandField.Heal, amount: hp(10) }, within(MAX));
    expect(after).toStrictEqual(state(0));
  });

  test('setting Hit Points sets the damage taken, held within 0 and the maximum', () => {
    expect(applyPlayCommand(state(0), { field: PlayCommandField.SetHp, current: hp(12) }, within(MAX))).toStrictEqual(
      state(8),
    );
    expect(applyPlayCommand(state(3), { field: PlayCommandField.SetHp, current: hp(99) }, within(MAX))).toStrictEqual(
      state(0),
    );
  });

  test('temporary Hit Points do not stack: the higher value is kept', () => {
    const lower = applyPlayCommand(state(0, 6), { field: PlayCommandField.SetTempHp, temp: hp(4) }, within(MAX));
    expect(lower.hp.temp).toBe(hp(6));
    const higher = applyPlayCommand(state(0, 6), { field: PlayCommandField.SetTempHp, temp: hp(9) }, within(MAX));
    expect(higher.hp.temp).toBe(hp(9));
  });

  test('damage past a lowered maximum reads as 0 Hit Points, and healing counts from there', () => {
    const lowered = hp(10);
    expect(currentHitPoints(state(15).hp, lowered)).toBe(hp(0));
    const healed = applyPlayCommand(state(15), { field: PlayCommandField.Heal, amount: hp(3) }, within(lowered));
    expect(currentHitPoints(healed.hp, lowered)).toBe(hp(3));
  });

  test('a raised maximum raises current Hit Points with it', () => {
    expect(currentHitPoints(state(5).hp, hp(30))).toBe(hp(25));
  });
});

describe('dying', () => {
  test('damage that takes Hit Points to 0 gains dying 1', () => {
    const after = applyPlayCommand(
      state(15),
      { field: PlayCommandField.Damage, damage: untypedDamage(hp(5)) },
      within(MAX),
    );
    expect(after.dying).toBe(Dying.parse(1));
    expect(currentHitPoints(after.hp, MAX)).toBe(hp(0));
  });

  test('a critical hit that takes Hit Points to 0 gains dying 2, plus wounded', () => {
    const wounded: PlayState = { ...state(10), wounded: Wounded.parse(1) };
    const critical = { ...untypedDamage(hp(30)), critical: true };
    const after = applyPlayCommand(wounded, { field: PlayCommandField.Damage, damage: critical }, within(MAX));
    expect(after.dying).toBe(Dying.parse(3));
    expect(after.wounded).toBe(Wounded.parse(1));
  });

  test('damage that temporary Hit Points absorb does not start dying', () => {
    const after = applyPlayCommand(
      state(0, 30),
      { field: PlayCommandField.Damage, damage: untypedDamage(hp(25)) },
      within(MAX),
    );
    expect(after.dying).toBe(Dying.parse(0));
  });

  test('damage that leaves Hit Points above 0 does not start dying', () => {
    const after = applyPlayCommand(
      state(0),
      { field: PlayCommandField.Damage, damage: untypedDamage(hp(19)) },
      within(MAX),
    );
    expect(after.dying).toBe(Dying.parse(0));
  });

  test('damage that takes a character to 0 from a wounded start can be fatal', () => {
    const wounded: PlayState = { ...state(0), wounded: Wounded.parse(3) };
    const after = applyPlayCommand(
      wounded,
      { field: PlayCommandField.Damage, damage: untypedDamage(hp(20)) },
      within(MAX),
    );
    expect(after.dead).toBe(true);
  });

  test('more damage at 0 Hit Points raises dying', () => {
    const down: PlayState = { ...state(20), dying: Dying.parse(1) };
    const after = applyPlayCommand(down, { field: PlayCommandField.Damage, damage: untypedDamage(hp(3)) }, within(MAX));
    expect(after.dying).toBe(Dying.parse(2));
  });

  test('healing above 0 ends dying and gains wounded', () => {
    const down: PlayState = { ...state(20), dying: Dying.parse(2) };
    const after = applyPlayCommand(down, { field: PlayCommandField.Heal, amount: hp(4) }, within(MAX));
    expect(after.dying).toBe(Dying.parse(0));
    expect(after.wounded).toBe(Wounded.parse(1));
    expect(currentHitPoints(after.hp, MAX)).toBe(hp(4));
  });

  test('healing that leaves Hit Points at 0 keeps dying', () => {
    const down: PlayState = { ...state(20), dying: Dying.parse(2) };
    const after = applyPlayCommand(down, { field: PlayCommandField.Heal, amount: hp(0) }, within(MAX));
    expect(after.dying).toBe(Dying.parse(2));
  });

  test('healing a dead character restores Hit Points but not life', () => {
    const dead: PlayState = { ...state(20), dying: Dying.parse(4), dead: true };
    const after = applyPlayCommand(dead, { field: PlayCommandField.Heal, amount: hp(6) }, within(MAX));
    expect(after.dead).toBe(true);
    expect(after.dying).toBe(Dying.parse(4));
  });

  test('setting Hit Points to 0 is a drop to 0, and setting them above 0 ends dying', () => {
    const down = applyPlayCommand(state(0), { field: PlayCommandField.SetHp, current: hp(0) }, within(MAX));
    expect(down.dying).toBe(Dying.parse(1));
    const up = applyPlayCommand(
      { ...state(20), dying: Dying.parse(1) },
      { field: PlayCommandField.SetHp, current: hp(5) },
      within(MAX),
    );
    expect(up.dying).toBe(Dying.parse(0));
    expect(up.wounded).toBe(Wounded.parse(1));
  });

  test('a recovery check moves dying by its degree', () => {
    const after = applyPlayCommand(
      dyingState(2),
      { field: PlayCommandField.RecoveryCheck, degree: DegreeOfSuccess.Failure },
      within(MAX),
    );
    expect(after.dying).toBe(Dying.parse(3));
  });

  test('the death track edits set their condition', () => {
    const doomed = applyPlayCommand(
      dyingState(0),
      { field: PlayCommandField.SetDoomed, doomed: Doomed.parse(2) },
      within(MAX),
    );
    expect(doomed.doomed).toBe(Doomed.parse(2));
    const wounded = applyPlayCommand(
      doomed,
      { field: PlayCommandField.SetWounded, wounded: Wounded.parse(1) },
      within(MAX),
    );
    expect(wounded.wounded).toBe(Wounded.parse(1));
    const set = applyPlayCommand(wounded, { field: PlayCommandField.SetDying, dying: Dying.parse(2) }, within(MAX));
    expect(set.dead).toBe(true);
  });

  test('stored play state from before the death track reads as no conditions', () => {
    expect(PlayStateSchema.parse({ hp: { damage: 3, temp: 0 } })).toStrictEqual({
      ...FRESH_PLAY,
      hp: { damage: hp(3), temp: hp(0) },
    });
  });
});

describe('toggles in play', () => {
  const rage = ToggleKey.parse('pack:effect:rage:0');

  test('a character with no play state yet has set no toggles', () => {
    expect(FRESH_PLAY.toggles).toStrictEqual({});
    expect(PlayStateSchema.parse({}).toggles).toStrictEqual({});
  });

  test('a toggle set is kept in the play state and leaves the rest of it alone', () => {
    const raging = applyPlayCommand(
      state(3),
      { field: PlayCommandField.SetToggle, toggle: rage, state: { on: true } },
      within(MAX),
    );
    expect(raging.toggles).toStrictEqual({ [rage]: { on: true } });
    expect(raging.hp).toStrictEqual(state(3).hp);
    expect(PlayStateSchema.parse(raging)).toStrictEqual(raging);
  });
});
