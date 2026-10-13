import { describe, expect, test } from 'bun:test';

import { HitPoints } from '@pioneer/rules/sdk';

import { applyPlayCommand, currentHitPoints, FRESH_PLAY, PlayCommandField, untypedDamage } from './play-state';
import type { PlayState } from './play-state';

const MAX = HitPoints.parse(20);

function hp(value: number): HitPoints {
  return HitPoints.parse(value);
}

function state(damage: number, temp = 0): PlayState {
  return { hp: { damage: hp(damage), temp: hp(temp) } };
}

describe('applyPlayCommand', () => {
  test('a character with no play state yet is at full Hit Points', () => {
    expect(currentHitPoints(FRESH_PLAY.hp, MAX)).toBe(MAX);
  });

  test('damage spends temporary Hit Points first', () => {
    const after = applyPlayCommand(state(0, 5), { field: PlayCommandField.Damage, damage: untypedDamage(hp(8)) }, MAX);
    expect(after).toStrictEqual(state(3, 0));
  });

  test('damage that temporary Hit Points absorb whole leaves Hit Points alone', () => {
    const after = applyPlayCommand(state(2, 5), { field: PlayCommandField.Damage, damage: untypedDamage(hp(4)) }, MAX);
    expect(after).toStrictEqual(state(2, 1));
  });

  test('Hit Points stop at 0', () => {
    const after = applyPlayCommand(state(15), { field: PlayCommandField.Damage, damage: untypedDamage(hp(30)) }, MAX);
    expect(currentHitPoints(after.hp, MAX)).toBe(hp(0));
  });

  test('healing stops at the maximum', () => {
    const after = applyPlayCommand(state(4), { field: PlayCommandField.Heal, amount: hp(10) }, MAX);
    expect(after).toStrictEqual(state(0));
  });

  test('setting Hit Points sets the damage taken, held within 0 and the maximum', () => {
    expect(applyPlayCommand(state(0), { field: PlayCommandField.SetHp, current: hp(12) }, MAX)).toStrictEqual(state(8));
    expect(applyPlayCommand(state(3), { field: PlayCommandField.SetHp, current: hp(99) }, MAX)).toStrictEqual(state(0));
  });

  test('temporary Hit Points do not stack: the higher value is kept', () => {
    const lower = applyPlayCommand(state(0, 6), { field: PlayCommandField.SetTempHp, temp: hp(4) }, MAX);
    expect(lower.hp.temp).toBe(hp(6));
    const higher = applyPlayCommand(state(0, 6), { field: PlayCommandField.SetTempHp, temp: hp(9) }, MAX);
    expect(higher.hp.temp).toBe(hp(9));
  });

  test('damage past a lowered maximum reads as 0 Hit Points, and healing counts from there', () => {
    const lowered = hp(10);
    expect(currentHitPoints(state(15).hp, lowered)).toBe(hp(0));
    const healed = applyPlayCommand(state(15), { field: PlayCommandField.Heal, amount: hp(3) }, lowered);
    expect(currentHitPoints(healed.hp, lowered)).toBe(hp(3));
  });

  test('a raised maximum raises current Hit Points with it', () => {
    expect(currentHitPoints(state(5).hp, hp(30))).toBe(hp(25));
  });
});
