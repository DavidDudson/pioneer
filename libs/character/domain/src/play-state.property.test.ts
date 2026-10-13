import { describe, expect, test } from 'bun:test';

import { DegreeOfSuccess, HitPoints } from '@pioneer/rules/sdk';
import { array, assert, boolean, constant, integer, oneof, property, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { deathThreshold, Doomed, Dying, Wounded } from './death-track';
import { applyPlayCommand, currentHitPoints, FRESH_PLAY, PlayCommandField, untypedDamage } from './play-state';
import type { PlayCommand } from './play-state';
import { currentResource, Resource, ResourceCount } from './resources';
import type { ResourceMaxima } from './resources';
import { within } from './testing';

const MAX_HP = 500;
const AMOUNT_MAX = 1000;
const COMMANDS_MAX = 40;
const CONDITION_MAX = 4;

const amount: Arbitrary<HitPoints> = integer({ min: 0, max: AMOUNT_MAX }).map((value) => HitPoints.parse(value));
const degree: Arbitrary<DegreeOfSuccess> = oneof(...Object.values(DegreeOfSuccess).map((each) => constant(each)));
const condition: Arbitrary<number> = integer({ min: 0, max: CONDITION_MAX });

const command: Arbitrary<PlayCommand> = oneof(
  amount.map((taken): PlayCommand => ({ field: PlayCommandField.Damage, damage: untypedDamage(taken) })),
  amount.map((value): PlayCommand => ({ field: PlayCommandField.Heal, amount: value })),
  amount.map((value): PlayCommand => ({ field: PlayCommandField.SetHp, current: value })),
  amount.map((value): PlayCommand => ({ field: PlayCommandField.SetTempHp, temp: value })),
  degree.map((each): PlayCommand => ({ field: PlayCommandField.RecoveryCheck, degree: each })),
  condition.map((value): PlayCommand => ({ field: PlayCommandField.SetDying, dying: Dying.parse(value) })),
  condition.map((value): PlayCommand => ({ field: PlayCommandField.SetWounded, wounded: Wounded.parse(value) })),
  condition.map((value): PlayCommand => ({ field: PlayCommandField.SetDoomed, doomed: Doomed.parse(value) })),
  boolean().chain((critical) =>
    amount.map((taken): PlayCommand => ({
      field: PlayCommandField.Damage,
      damage: { ...untypedDamage(taken), critical },
    })),
  ),
);

const max: Arbitrary<HitPoints> = oneof(
  constant(HitPoints.parse(0)),
  integer({ min: 1, max: MAX_HP }).map((value) => HitPoints.parse(value)),
);

describe('applyPlayCommand', () => {
  test('Hit Points stay within 0 and the maximum for any sequence of commands', () => {
    assert(
      property(max, array(command, { maxLength: COMMANDS_MAX }), (maximum, commands) => {
        let play = FRESH_PLAY;
        for (const each of commands) {
          play = applyPlayCommand(play, each, within(maximum));
          const current = currentHitPoints(play.hp, maximum);
          expect(current).toBeGreaterThanOrEqual(0);
          expect(current).toBeLessThanOrEqual(maximum);
          expect(play.hp.damage).toBeLessThanOrEqual(maximum);
          expect(play.hp.temp).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  test('dying never reaches the death threshold without death, and death never lifts but by a dying edit', () => {
    assert(
      property(max, array(command, { maxLength: COMMANDS_MAX }), (maximum, commands) => {
        let play = FRESH_PLAY;
        for (const each of commands) {
          const before = play;
          play = applyPlayCommand(play, each, within(maximum));
          if (!play.dead) {
            expect(play.dying).toBeLessThan(deathThreshold(play.doomed));
          }
          if (before.dead && each.field !== PlayCommandField.SetDying) {
            expect(play.dead).toBe(true);
          }
        }
      }),
    );
  });
});

const POOL_MAX = 6;

const resource: Arbitrary<Resource> = oneof(...Object.values(Resource).map((each) => constant(each)));
const points: Arbitrary<ResourceCount> = integer({ min: 0, max: POOL_MAX * 2 }).map((value) =>
  ResourceCount.parse(value),
);
const poolMaxima: Arbitrary<ResourceMaxima> = tuple(
  integer({ min: 0, max: POOL_MAX }),
  integer({ min: 0, max: POOL_MAX }),
).map(([hero, focus]): ResourceMaxima => ({
  [Resource.HeroPoints]: ResourceCount.parse(hero),
  [Resource.FocusPoints]: ResourceCount.parse(focus),
}));

const resourceCommand: Arbitrary<PlayCommand> = oneof(
  tuple(resource, points).map(([each, value]): PlayCommand => ({
    field: PlayCommandField.SpendResource,
    resource: each,
    amount: value,
  })),
  tuple(resource, points).map(([each, value]): PlayCommand => ({
    field: PlayCommandField.RegainResource,
    resource: each,
    amount: value,
  })),
  tuple(resource, points).map(([each, value]): PlayCommand => ({
    field: PlayCommandField.SetResource,
    resource: each,
    current: value,
  })),
  command,
);

describe('applyPlayCommand resources', () => {
  test('points held stay within 0 and the pool maximum for any sequence of commands', () => {
    assert(
      property(poolMaxima, array(resourceCommand, { maxLength: COMMANDS_MAX }), (maxima, commands) => {
        let play = FRESH_PLAY;
        for (const each of commands) {
          play = applyPlayCommand(play, each, within(HitPoints.parse(MAX_HP), maxima));
          for (const pool of Object.values(Resource)) {
            const held = currentResource(play.resources, pool, maxima);
            expect(held).toBeGreaterThanOrEqual(0);
            expect(held).toBeLessThanOrEqual(maxima[pool]);
          }
        }
      }),
    );
  });
});
