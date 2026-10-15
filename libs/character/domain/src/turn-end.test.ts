import { describe, expect, test } from 'bun:test';

import { DieFace } from '@pioneer/rules/dice';
import type { RandomSource } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import {
  BadgeReevaluation,
  ConditionEffect,
  ConditionValue,
  ContentId,
  DamageAdjustment,
  DamageFormula,
  DamageType,
  EffectBadgeType,
  EffectExpiry,
  HitPoints,
  NO_DEFENCES,
} from '@pioneer/rules/sdk';

import { ConditionDurationKind, ConditionInstanceId } from './conditions';
import type { ActiveCondition } from './conditions';
import { Dying, Wounded } from './death-track';
import { EffectBadgeValue, EffectInstanceId, EffectRounds, SELF } from './effects';
import type { ActiveEffect, EffectContent, EffectTerms } from './effects';
import { currentHitPoints, FRESH_PLAY } from './play-state';
import type { PlayState } from './play-state';
import { within } from './testing';
import { endTurn } from './turn-end';
import type { EndTurnInputs } from './turn-end';
import { TurnEventKind, TurnMessage } from './turn-events';
import type { TurnOutcome } from './turn-start';

const MAX = HitPoints.parse(30);
const BURNING = ContentId.parse('00000000-0000-4000-8000-0000000000c1');
const FRIGHTENED = ContentId.parse('00000000-0000-4000-8000-0000000000c2');
const HEROISM = ContentId.parse('00000000-0000-4000-8000-0000000000a1');
const INSPIRE = ContentId.parse('00000000-0000-4000-8000-0000000000a3');

const faces = (...each: readonly number[]): RandomSource => scriptedRandom(each.map((face) => DieFace.parse(face)));

const CONTENT: EffectContent = new Map<ContentId, EffectTerms>([
  [
    INSPIRE,
    {
      remaining: undefined,
      expiry: EffectExpiry.TurnEnd,
      sustained: false,
      badge: {
        type: EffectBadgeType.Formula,
        formula: DamageFormula.parse('1d4'),
        reevaluate: BadgeReevaluation.TurnEnd,
      },
    },
  ],
]);
const INPUTS: EndTurnInputs = {
  limits: { ...within(MAX), effects: CONTENT },
  defences: NO_DEFENCES,
  recovery: new Map([[FRIGHTENED, ConditionEffect.Lower]]),
};

const burning = (assisted = false, id = 1): ActiveCondition => ({
  id: ConditionInstanceId.parse(`00000000-0000-4000-8000-00000000030${id}`),
  condition: BURNING,
  duration: { kind: ConditionDurationKind.Unlimited },
  persistent: { formula: DamageFormula.parse('1d6'), type: DamageType.Fire, assisted },
});

const frightened = (value: number): ActiveCondition => ({
  id: ConditionInstanceId.parse('00000000-0000-4000-8000-000000000310'),
  condition: FRIGHTENED,
  value: ConditionValue.parse(value),
  duration: { kind: ConditionDurationKind.Unlimited },
});

const effect = (count: number, extra: Partial<ActiveEffect>): ActiveEffect => ({
  id: EffectInstanceId.parse(`00000000-0000-4000-8000-00000000050${count}`),
  effect: HEROISM,
  source: SELF,
  ...extra,
});

const playing = (rest: Partial<PlayState>): PlayState => ({ ...FRESH_PLAY, ...rest });

const finish = (play: PlayState, random: RandomSource, inputs: EndTurnInputs = INPUTS): TurnOutcome =>
  endTurn(play, inputs, random);

describe('endTurn: persistent damage', () => {
  test('rolls its dice, takes the damage, then a failed flat check keeps it', () => {
    const { play, events } = finish(playing({ conditions: [burning()] }), faces(4, 14));
    expect(currentHitPoints(play.hp, MAX)).toBe(HitPoints.parse(26));
    expect(play.conditions).toHaveLength(1);
    expect(events).toMatchObject([
      { kind: TurnEventKind.PersistentDamage, damage: { taken: 4 }, message: { key: TurnMessage.PersistentDamage } },
      { kind: TurnEventKind.FlatCheck, die: 14, dc: 15, passed: false, message: { key: TurnMessage.FlatCheckFailed } },
    ]);
  });

  test('a flat check of 15 ends it', () => {
    const { play, events } = finish(playing({ conditions: [burning()] }), faces(2, 15));
    expect(play.conditions).toEqual([]);
    expect(events.map(({ kind }) => kind)).toEqual([
      TurnEventKind.PersistentDamage,
      TurnEventKind.FlatCheck,
      TurnEventKind.ConditionEnded,
    ]);
  });

  test('assisted recovery lowers the DC to 10', () => {
    const { play, events } = finish(playing({ conditions: [burning(true)] }), faces(2, 10));
    expect(play.conditions).toEqual([]);
    expect(events[1]).toMatchObject({ dc: 10, passed: true, message: { key: TurnMessage.FlatCheckPassed } });
  });

  test('the damage goes through the defences, temporary Hit Points first', () => {
    const resists: EndTurnInputs = {
      ...INPUTS,
      defences: { ...NO_DEFENCES, resistances: [DamageAdjustment.parse({ type: DamageType.Fire, value: 2 })] },
    };
    const start = playing({
      conditions: [burning()],
      hp: { damage: HitPoints.parse(0), temp: HitPoints.parse(3) },
    });
    const { play, events } = finish(start, faces(6, 1), resists);
    expect(events[0]).toMatchObject({ damage: { taken: 4 } });
    expect(play.hp).toEqual({ temp: HitPoints.parse(0), damage: HitPoints.parse(1) });
  });

  test('dropping to 0 Hit Points makes the character dying; more damage at 0 worsens it', () => {
    const down = playing({ conditions: [burning()], hp: { damage: HitPoints.parse(28), temp: HitPoints.parse(0) } });
    const first = finish(down, faces(6, 1)).play;
    expect(currentHitPoints(first.hp, MAX)).toBe(HitPoints.parse(0));
    expect(first.dying).toBe(Dying.parse(1));
    const second = finish(first, faces(2, 1)).play;
    expect(second.dying).toBe(Dying.parse(2));
  });

  test('a dead character takes nothing', () => {
    const dead = playing({ conditions: [burning()], dead: true, dying: Dying.parse(4) });
    const { play, events } = finish(dead, faces(6, 1));
    expect(play.hp.damage).toBe(HitPoints.parse(0));
    expect(events).toEqual([]);
  });

  test('several are rolled in order, each with its own check', () => {
    const { events } = finish(playing({ conditions: [burning(false, 1), burning(false, 2)] }), faces(1, 20, 2, 3));
    expect(events.map(({ kind }) => kind)).toEqual([
      TurnEventKind.PersistentDamage,
      TurnEventKind.FlatCheck,
      TurnEventKind.ConditionEnded,
      TurnEventKind.PersistentDamage,
      TurnEventKind.FlatCheck,
    ]);
  });
});

describe('endTurn: the rest of the end of the turn', () => {
  test('frightened goes down by 1, and ends at 1', () => {
    const lowered = finish(playing({ conditions: [frightened(2)] }), faces(1)).play;
    expect(lowered.conditions[0]?.value).toBe(ConditionValue.parse(1));
    const { play, events } = finish(playing({ conditions: [frightened(1)] }), faces(1));
    expect(play.conditions).toEqual([]);
    expect(events).toMatchObject([{ kind: TurnEventKind.ConditionEnded }]);
  });

  test('persistent damage comes first, then frightened, then expiries', () => {
    const ends: ActiveCondition = {
      ...frightened(1),
      id: ConditionInstanceId.parse('00000000-0000-4000-8000-000000000311'),
      condition: HEROISM,
      duration: { kind: ConditionDurationKind.UntilEndOfTurn },
    };
    const last: ActiveEffect = {
      id: EffectInstanceId.parse('00000000-0000-4000-8000-000000000401'),
      effect: HEROISM,
      source: SELF,
      remaining: EffectRounds.parse(1),
      expiry: EffectExpiry.TurnEnd,
    };
    const { events } = finish(playing({ conditions: [burning(), frightened(2), ends], effects: [last] }), faces(3, 1));
    expect(events.map(({ kind }) => kind)).toEqual([
      TurnEventKind.PersistentDamage,
      TurnEventKind.FlatCheck,
      TurnEventKind.ConditionLowered,
      TurnEventKind.EffectExpired,
      TurnEventKind.ConditionEnded,
    ]);
  });

  test('a turn-end effect with rounds left stays; one on its last round or with no clock goes; turn-start ones stay', () => {
    const stays = effect(1, { remaining: EffectRounds.parse(2), expiry: EffectExpiry.TurnEnd });
    const startEnds = effect(2, { remaining: EffectRounds.parse(1), expiry: EffectExpiry.TurnStart });
    const goes = [
      effect(3, { remaining: EffectRounds.parse(1), expiry: EffectExpiry.TurnEnd }),
      effect(4, { expiry: EffectExpiry.TurnEnd }),
    ];
    const { play } = finish(playing({ effects: [stays, startEnds, ...goes] }), faces(1));
    expect(play.effects).toEqual([stays, startEnds]);
  });

  test('a formula badge that rolls again at turn end does, from the seeded dice', () => {
    const rolling: ActiveEffect = {
      id: EffectInstanceId.parse('00000000-0000-4000-8000-000000000601'),
      effect: INSPIRE,
      source: SELF,
      remaining: EffectRounds.parse(3),
      expiry: EffectExpiry.TurnEnd,
      badge: EffectBadgeValue.parse(9),
    };
    const { play } = finish(playing({ effects: [rolling] }), faces(3));
    expect(play.effects[0]?.badge).toBe(EffectBadgeValue.parse(3));
  });

  test('a character with nothing to do gets no events', () => {
    expect(finish(FRESH_PLAY, faces(1))).toEqual({ play: FRESH_PLAY, events: [] });
    expect(Wounded.parse(0)).toBe(FRESH_PLAY.wounded);
  });
});
