import { describe, expect, test } from 'bun:test';

import { HitPoints } from '@pioneer/rules/sdk';

import { AirRounds, SuffocationChecks } from './breath';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { within } from './testing';
import { untypedDamage } from './untyped-damage';

const MAX = HitPoints.parse(20);
const DAMAGE = HitPoints.parse(3);

function holding(air: number): PlayState {
  return { ...FRESH_PLAY, breath: { air: AirRounds.parse(air), checks: SuffocationChecks.parse(0) } };
}

function hit(play: PlayState, critical: boolean): PlayState {
  return applyPlayCommand(
    play,
    { field: PlayCommandField.Damage, damage: untypedDamage(DAMAGE, critical) },
    within(MAX),
  );
}

describe('a critical hit while holding the breath', () => {
  test('costs a round of air', () => {
    expect(hit(holding(5), true).breath?.air).toBe(AirRounds.parse(4));
  });

  test('is the only hit that does', () => {
    expect(hit(holding(5), false).breath?.air).toBe(AirRounds.parse(5));
  });

  test('stops at no air', () => {
    expect(hit(holding(0), true).breath?.air).toBe(AirRounds.parse(0));
  });

  test('leaves a character breathing freely alone', () => {
    expect(hit(FRESH_PLAY, true).breath).toBeUndefined();
  });
});
