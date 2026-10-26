import { describe, expect, test } from 'bun:test';

import { DieFace, RollTotal } from '@pioneer/rules/dice';
import type { RandomSource } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import {
  AttributeModifier,
  AttributeModifiers,
  Attribute,
  DegreeOfSuccess,
  HitPoints,
  NO_DEFENCES,
} from '@pioneer/rules/sdk';

import {
  AirRounds,
  airAfterTurn,
  applyBreathCommand,
  BreathCommandField,
  isBreathCommand,
  isSuffocating,
  maxAir,
  SuffocationChecks,
  suffocationDamage,
  suffocationDc,
} from './breath';
import type { BreathState } from './breath';
import { FRESH_PLAY, currentHitPoints } from './play-state';
import type { PlayState } from './play-state';
import { within } from './testing';
import { endTurn } from './turn-end';
import type { EndTurnInputs } from './turn-end';
import { TurnEventKind } from './turn-events';
import { AttackCount, TurnPhase } from './turn-state';

const MAX = HitPoints.parse(30);
const fortitude = (): RollTotal => RollTotal.parse(5);
const air = (rounds: number): AirRounds => AirRounds.parse(rounds);
const checks = (count: number): SuffocationChecks => SuffocationChecks.parse(count);
const faces = (...each: readonly number[]): RandomSource => scriptedRandom(each.map((face) => DieFace.parse(face)));

const INPUTS: EndTurnInputs = {
  limits: { ...within(MAX), effects: new Map() },
  defences: NO_DEFENCES,
  recovery: new Map(),
};

/** A character holding its breath with `breath`, on its turn after `attacks` attacks. */
function holding(breath: BreathState, attacks = 0): PlayState {
  return {
    ...FRESH_PLAY,
    breath,
    turn: { ...FRESH_PLAY.turn, phase: TurnPhase.Turn, attacks: AttackCount.parse(attacks) },
  };
}

describe('maxAir', () => {
  test('is 5 rounds plus the Constitution modifier', () => {
    const modifiers = AttributeModifiers.none.with(Attribute.Constitution, AttributeModifier.parse(3));

    expect(Number(maxAir(modifiers))).toBe(8);
    expect(Number(maxAir(AttributeModifiers.none))).toBe(5);
  });

  test('is never below none', () => {
    const modifiers = AttributeModifiers.none.with(Attribute.Constitution, AttributeModifier.parse(-5));

    expect(Number(maxAir(modifiers))).toBe(0);
  });
});

describe('breath commands', () => {
  test('setBreath holds the breath as given, and clearBreath lets the character breathe again', () => {
    const set = { field: BreathCommandField.SetBreath, air: air(6), checks: checks(0) } as const;
    const clear = { field: BreathCommandField.ClearBreath } as const;

    expect(applyBreathCommand(set)).toEqual({ air: air(6), checks: checks(0) });
    expect(applyBreathCommand(clear)).toBeUndefined();
    expect(isBreathCommand(set)).toBe(true);
    expect(isBreathCommand({ field: 'damage' })).toBe(false);
  });
});

describe('suffocation', () => {
  test('the saves are DC 20, and 5 more each time', () => {
    expect([1, 2, 3].map((check) => Number(suffocationDc(checks(check))))).toEqual([20, 25, 30]);
  });

  test('a failed save costs a 1d10 more each time', () => {
    expect([1, 2, 3].map((check) => String(suffocationDamage(checks(check))))).toEqual(['1d10', '2d10', '3d10']);
  });

  test('a character is suffocating only when it is holding its breath with none left', () => {
    expect(isSuffocating(undefined)).toBe(false);
    expect(isSuffocating({ air: air(1), checks: checks(0) })).toBe(false);
    expect(isSuffocating({ air: air(0), checks: checks(0) })).toBe(true);
  });
});

describe('airAfterTurn', () => {
  test('loses a round, or two when the character attacked or cast a spell, and never below none', () => {
    const calm = airAfterTurn(air(5), false);
    const exerted = airAfterTurn(air(5), true);
    const spent = airAfterTurn(air(1), true);

    expect([Number(calm), Number(exerted), Number(spent)]).toEqual([4, 3, 0]);
  });
});

describe('endTurn while holding a breath', () => {
  test('loses a round of air and says how much is left', () => {
    const { play, events } = endTurn(holding({ air: air(5), checks: checks(0) }), INPUTS, faces(10));

    expect(play.breath).toEqual({ air: air(4), checks: checks(0) });
    expect(events.map(({ kind }) => kind)).toContain(TurnEventKind.AirLost);
  });

  test('loses two rounds when the character attacked this turn', () => {
    const { play } = endTurn(holding({ air: air(5), checks: checks(0) }, 1), INPUTS, faces(10));

    expect(Number(play.breath?.air)).toBe(3);
  });

  test('leaves a character breathing freely alone', () => {
    const { play, events } = endTurn(FRESH_PLAY, INPUTS, faces(10));

    expect(play.breath).toBeUndefined();
    expect(events).toEqual([]);
  });

  test('makes the DC 20 Fortitude save once out of air, and a success costs nothing', () => {
    const { play, events } = endTurn(holding({ air: air(0), checks: checks(0) }), { ...INPUTS, fortitude }, faces(15));
    const save = events.find(({ kind }) => kind === TurnEventKind.Suffocation);

    expect(play.breath).toEqual({ air: air(0), checks: checks(1) });
    expect(Number(currentHitPoints(play.hp, MAX))).toBe(30);
    expect(save).toMatchObject({ check: 1, die: 15, total: 20, dc: 20, degree: DegreeOfSuccess.Success });
  });

  test('a failed save costs 1d10 Hit Points, and the next is against DC 25 for 2d10', () => {
    const first = endTurn(holding({ air: air(0), checks: checks(0) }), INPUTS, faces(12, 4));
    const second = endTurn(first.play, INPUTS, faces(16, 6, 3));

    expect(Number(currentHitPoints(first.play.hp, MAX))).toBe(26);
    expect(second.events).toMatchObject([{ check: 2, dc: 25, degree: DegreeOfSuccess.Failure, taken: 9 }]);
    expect(Number(currentHitPoints(second.play.hp, MAX))).toBe(17);
  });

  test('a critical failure kills', () => {
    const { play, events } = endTurn(holding({ air: air(0), checks: checks(0) }), INPUTS, faces(1));

    expect(play.dead).toBe(true);
    expect(events).toMatchObject([{ degree: DegreeOfSuccess.CriticalFailure }]);
  });

  test('a dead character is left alone', () => {
    const { events } = endTurn({ ...holding({ air: air(0), checks: checks(0) }), dead: true }, INPUTS, faces(1));

    expect(events.filter(({ kind }) => kind === TurnEventKind.Suffocation)).toEqual([]);
  });
});
