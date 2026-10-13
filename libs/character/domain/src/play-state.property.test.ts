import { describe, expect, test } from 'bun:test';

import { HitPoints } from '@pioneer/rules/sdk';
import { array, assert, constant, integer, oneof, property } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { applyPlayCommand, currentHitPoints, FRESH_PLAY, PlayCommandField, untypedDamage } from './play-state';
import type { PlayCommand } from './play-state';

const MAX_HP = 500;
const AMOUNT_MAX = 1000;
const COMMANDS_MAX = 40;

const amount: Arbitrary<HitPoints> = integer({ min: 0, max: AMOUNT_MAX }).map((value) => HitPoints.parse(value));

const command: Arbitrary<PlayCommand> = oneof(
  amount.map((taken): PlayCommand => ({ field: PlayCommandField.Damage, damage: untypedDamage(taken) })),
  amount.map((value): PlayCommand => ({ field: PlayCommandField.Heal, amount: value })),
  amount.map((value): PlayCommand => ({ field: PlayCommandField.SetHp, current: value })),
  amount.map((value): PlayCommand => ({ field: PlayCommandField.SetTempHp, temp: value })),
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
          play = applyPlayCommand(play, each, maximum);
          const current = currentHitPoints(play.hp, maximum);
          expect(current).toBeGreaterThanOrEqual(0);
          expect(current).toBeLessThanOrEqual(maximum);
          expect(play.hp.damage).toBeLessThanOrEqual(maximum);
          expect(play.hp.temp).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });
});
