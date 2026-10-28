import { describe, expect, test } from 'bun:test';

import { DieFace } from '@pioneer/rules/dice';
import type { RandomSource } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import {
  ContentId,
  DamageType,
  DurationCount,
  DurationUnit,
  EnvironmentData,
  HitPoints,
  NO_DEFENCES,
} from '@pioneer/rules/sdk';

import { ExposureRounds } from './environment-exposure';
import type { EnvironmentDuration } from './environment-exposure';
import { passTime } from './environment-time';
import type { PassTimeInputs } from './environment-time';
import type { EnvironmentContent } from './environments';
import { applyPlayCommand, currentHitPoints, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { within } from './testing';
import { TurnEventKind } from './turn-events';

const MAX = HitPoints.parse(60);
const COLD = ContentId.parse('00000000-0000-4000-8000-0000000000e1');
const SUN = ContentId.parse('00000000-0000-4000-8000-0000000000e2');
const FATIGUED = ContentId.parse('00000000-0000-4000-8000-0000000000e3');

const faces = (...each: readonly number[]): RandomSource => scriptedRandom(each.map((face) => DieFace.parse(face)));

const EVERY_TEN_MINUTES = {
  after: { count: 10, unit: 'minute' },
  damage: { category: 'minor', type: DamageType.Cold },
  repeats: true,
};
const AFTER_FOUR_HOURS = { after: { count: 4, unit: 'hour' }, applies: FATIGUED };

const CONTENT: EnvironmentContent = new Map([
  [COLD, EnvironmentData.parse({ consequences: [EVERY_TEN_MINUTES, AFTER_FOUR_HOURS] })],
  [SUN, EnvironmentData.parse({ consequences: [] })],
]);
const INPUTS: Omit<PassTimeInputs, 'random'> = { limits: within(MAX), defences: NO_DEFENCES, environments: CONTENT };

const turnedOn = (...environments: readonly ContentId[]): PlayState => {
  let play = FRESH_PLAY;
  for (const environment of environments) {
    play = applyPlayCommand(play, { field: PlayCommandField.SetEnvironment, environment, active: true }, within(MAX));
  }
  return play;
};

const ones = (count: number): RandomSource => faces(...Array.from({ length: count }, () => 1));

const minutes = (count: number): EnvironmentDuration => ({
  count: DurationCount.parse(count),
  unit: DurationUnit.Minute,
});
const hours = (count: number): EnvironmentDuration => ({ count: DurationCount.parse(count), unit: DurationUnit.Hour });

describe('passTime', () => {
  test('starts the clock when an environment is turned on, and forgets it when turned off', () => {
    const on = turnedOn(COLD);
    const off = applyPlayCommand(
      on,
      { field: PlayCommandField.SetEnvironment, environment: COLD, active: false },
      within(MAX),
    );

    expect(on.exposure).toEqual([{ environment: COLD, elapsed: 0 }]);
    expect(off.exposure).toEqual([]);
  });

  test('moves the clock of each environment the character is in', () => {
    const { play } = passTime(turnedOn(COLD, SUN), minutes(3), { ...INPUTS, random: faces() });

    expect(play.exposure).toEqual([
      { environment: COLD, elapsed: ExposureRounds.parse(30) },
      { environment: SUN, elapsed: ExposureRounds.parse(30) },
    ]);
  });

  test('deals damage each time the period passes, rolled through the defences', () => {
    const { play, events } = passTime(turnedOn(COLD), minutes(20), { ...INPUTS, random: faces(4, 6) });

    expect(MAX - currentHitPoints(play.hp, MAX)).toBe(10);
    expect(events.map(({ kind }) => kind)).toEqual([TurnEventKind.EnvironmentDamage, TurnEventKind.EnvironmentDamage]);
  });

  test('counts a period that was partly spent before, and deals nothing before it is done', () => {
    const early = passTime(turnedOn(COLD), minutes(6), { ...INPUTS, random: faces(1) });
    const later = passTime(early.play, minutes(4), { ...INPUTS, random: faces(5) });

    expect(early.events).toEqual([]);
    expect(later.events).toHaveLength(1);
    expect(MAX - currentHitPoints(later.play.hp, MAX)).toBe(5);
  });

  test('puts a condition on once when its time is reached, and not again', () => {
    const first = passTime(turnedOn(SUN, COLD), hours(4), { ...INPUTS, random: ones(24) });
    const again = passTime(first.play, hours(4), { ...INPUTS, random: ones(24) });

    expect(first.play.conditions.map(({ condition }) => condition)).toEqual([FATIGUED]);
    expect(again.play.conditions).toHaveLength(1);
    expect(again.events.some(({ kind }) => kind === TurnEventKind.EnvironmentCondition)).toBe(false);
  });

  test('does nothing to a character in no environment', () => {
    const outcome = passTime(FRESH_PLAY, hours(8), { ...INPUTS, random: faces() });

    expect(outcome).toEqual({ play: FRESH_PLAY, events: [] });
  });

  test('deals no damage to a dead character', () => {
    const dead = { ...turnedOn(COLD), dead: true };

    const { events } = passTime(dead, hours(1), { ...INPUTS, random: faces(3, 3, 3, 3, 3, 3) });

    expect(events.some(({ kind }) => kind === TurnEventKind.EnvironmentDamage)).toBe(false);
  });
});
