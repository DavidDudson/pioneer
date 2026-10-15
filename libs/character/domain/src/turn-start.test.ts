import { describe, expect, test } from 'bun:test';

import { RandomSeed, seededRandom } from '@pioneer/rules/dice/testing';
import type { RecoveryInPlay } from '@pioneer/rules/engine';
import {
  BadgeReevaluation,
  ContentId,
  DamageFormula,
  EffectBadgeType,
  EffectExpiry,
  FastHealingType,
  HitPoints,
} from '@pioneer/rules/sdk';

import { ConditionDurationKind, ConditionInstanceId } from './conditions';
import type { ActiveCondition } from './conditions';
import { Doomed, Dying, Wounded } from './death-track';
import { EffectBadgeValue, EffectInstanceId, EffectRounds, EffectSourceKind, SELF } from './effects';
import type { ActiveEffect, EffectContent, EffectTerms } from './effects';
import { currentHitPoints, FRESH_PLAY } from './play-state';
import type { PlayState } from './play-state';
import { within } from './testing';
import { TurnEventKind, TurnMessage } from './turn-events';
import { startTurn } from './turn-start';
import type { TurnOutcome } from './turn-start';

const MAX = HitPoints.parse(30);
const SEED = RandomSeed.parse(7);

const HEROISM = ContentId.parse('00000000-0000-4000-8000-0000000000a1');
const STANCE = ContentId.parse('00000000-0000-4000-8000-0000000000a2');
const INSPIRE = ContentId.parse('00000000-0000-4000-8000-0000000000a3');
const FRIGHTENED = ContentId.parse('00000000-0000-4000-8000-0000000000b1');

const effectId = (count: number): EffectInstanceId =>
  EffectInstanceId.parse(`00000000-0000-4000-8000-00000000010${count}`);
const rounds = (count: number): EffectRounds => EffectRounds.parse(count);

const CONTENT: EffectContent = new Map<ContentId, EffectTerms>([
  [
    INSPIRE,
    {
      remaining: rounds(10),
      expiry: EffectExpiry.TurnEnd,
      sustained: false,
      badge: {
        type: EffectBadgeType.Formula,
        formula: DamageFormula.parse('1d4'),
        reevaluate: BadgeReevaluation.TurnStart,
      },
    },
  ],
]);
const LIMITS = { ...within(MAX), effects: CONTENT };

const FAST: RecoveryInPlay = {
  type: FastHealingType.FastHealing,
  amount: HitPoints.parse(5),
  deactivatedBy: [],
  origins: [],
};
const REGEN: RecoveryInPlay = { ...FAST, type: FastHealingType.Regeneration, amount: HitPoints.parse(10) };

const effect = (count: number, extra: Partial<ActiveEffect> = {}): ActiveEffect => ({
  id: effectId(count),
  effect: HEROISM,
  source: SELF,
  ...extra,
});

const hurt = (damage: number, rest: Partial<PlayState> = {}): PlayState => ({
  ...FRESH_PLAY,
  hp: { damage: HitPoints.parse(damage), temp: HitPoints.parse(0) },
  ...rest,
});

const start = (play: PlayState, recovery: readonly RecoveryInPlay[] = []): TurnOutcome =>
  startTurn(play, { limits: LIMITS, recovery }, seededRandom(SEED));

describe('startTurn', () => {
  test('opens with a turn-start event that has a message key', () => {
    const { events } = start(FRESH_PLAY);
    expect(events[0]).toMatchObject({ kind: TurnEventKind.TurnStart, message: { key: TurnMessage.TurnStart } });
  });

  test('fast healing and regeneration heal their amount, each with an event', () => {
    const { play, events } = start(hurt(20), [FAST, REGEN]);
    expect(currentHitPoints(play.hp, MAX)).toBe(HitPoints.parse(25));
    expect(events.filter(({ kind }) => kind === TurnEventKind.Healed)).toMatchObject([
      {
        type: FastHealingType.FastHealing,
        gained: 5,
        message: { key: TurnMessage.FastHealing, params: { amount: 5 } },
      },
      { type: FastHealingType.Regeneration, gained: 10, message: { key: TurnMessage.Regeneration } },
    ]);
  });

  test('healing stops at the maximum and says only what was gained; none gained is no event', () => {
    const near = start(hurt(3), [FAST]);
    expect(near.events).toMatchObject([{}, { kind: TurnEventKind.Healed, gained: 3 }]);
    const full = start(FRESH_PLAY, [FAST]);
    expect(full.events).toHaveLength(1);
  });

  test('healing from 0 Hit Points ends dying and wounds', () => {
    const down = hurt(30, { dying: Dying.parse(1) });
    const { play } = start(down, [FAST]);
    expect(play.dying).toBe(Dying.parse(0));
    expect(play.wounded).toBe(Wounded.parse(1));
  });

  test('a dead character is not healed', () => {
    const dead = hurt(30, { dying: Dying.parse(4), dead: true, doomed: Doomed.parse(0) });
    expect(start(dead, [FAST]).play.hp.damage).toBe(HitPoints.parse(30));
  });

  test('a timed effect counts down a round, including one from another creature', () => {
    const other = effect(1, { remaining: rounds(3), source: { kind: EffectSourceKind.Gm } });
    const { play, events } = start({ ...FRESH_PLAY, effects: [other, effect(2)] });
    expect(play.effects).toMatchObject([{ remaining: 2 }, {}]);
    expect(play.effects[1]?.remaining).toBeUndefined();
    expect(events).toHaveLength(1);
  });

  test('an effect whose rounds run out at a turn start is removed, with an event', () => {
    const last = effect(1, { remaining: rounds(1), expiry: EffectExpiry.TurnStart });
    const { play, events } = start({ ...FRESH_PLAY, effects: [last] });
    expect(play.effects).toEqual([]);
    expect(events[1]).toMatchObject({
      kind: TurnEventKind.EffectExpired,
      effect: HEROISM,
      instance: effectId(1),
      message: { key: TurnMessage.EffectExpired },
    });
  });

  test('an effect with no expiry named ends at a turn start', () => {
    const timed = effect(1, { remaining: rounds(1) });
    expect(start({ ...FRESH_PLAY, effects: [timed] }).play.effects).toEqual([]);
  });

  test('an effect with no clock that ends at a turn start is removed; one with no expiry stays', () => {
    const turn = effect(1, { expiry: EffectExpiry.TurnStart });
    const encounter = effect(2);
    const { play, events } = start({ ...FRESH_PLAY, effects: [turn, encounter] });
    expect(play.effects).toEqual([encounter]);
    expect(events[1]).toMatchObject({ kind: TurnEventKind.EffectExpired, instance: effectId(1) });
  });

  test('an effect that ends at a turn end stays on its last round for the end of turn', () => {
    const last = effect(1, { remaining: rounds(1), expiry: EffectExpiry.TurnEnd });
    const { play, events } = start({ ...FRESH_PLAY, effects: [last] });
    expect(play.effects).toEqual([last]);
    expect(events).toHaveLength(1);
  });

  test('conditions ending at the start of the turn are removed; others stay', () => {
    const ends: ActiveCondition = {
      id: ConditionInstanceId.parse('00000000-0000-4000-8000-000000000201'),
      condition: FRIGHTENED,
      duration: { kind: ConditionDurationKind.UntilStartOfTurn },
    };
    const stays: ActiveCondition = {
      ...ends,
      id: ConditionInstanceId.parse('00000000-0000-4000-8000-000000000202'),
      duration: { kind: ConditionDurationKind.UntilEndOfTurn },
    };
    const { play, events } = start({ ...FRESH_PLAY, conditions: [ends, stays] });
    expect(play.conditions).toEqual([stays]);
    expect(events[1]).toMatchObject({ kind: TurnEventKind.ConditionEnded, condition: FRIGHTENED, instance: ends.id });
  });

  test('a formula badge that rolls again at turn start rolls from the seeded source', () => {
    const rolling = effect(1, { effect: INSPIRE, badge: EffectBadgeValue.parse(99) });
    const first = start({ ...FRESH_PLAY, effects: [rolling] }).play.effects[0]?.badge;
    const again = start({ ...FRESH_PLAY, effects: [rolling] }).play.effects[0]?.badge;
    expect(first).toBeGreaterThanOrEqual(1);
    expect(first).toBeLessThanOrEqual(4);
    expect(again).toBe(first);
  });

  test('a badge that does not roll again, or whose effect expired, is left alone', () => {
    const plain = effect(1, { effect: STANCE, badge: EffectBadgeValue.parse(2) });
    expect(start({ ...FRESH_PLAY, effects: [plain] }).play.effects).toEqual([plain]);
    const gone = effect(2, { effect: INSPIRE, remaining: rounds(1), expiry: EffectExpiry.TurnStart });
    expect(start({ ...FRESH_PLAY, effects: [gone] }).play.effects).toEqual([]);
  });
});
