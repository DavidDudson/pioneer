import { describe, expect, test } from 'bun:test';

import {
  ContentId,
  DamageFormula,
  DurationCount,
  DurationUnit,
  EffectBadgeType,
  EffectData,
  EffectExpiry,
  HitPoints,
  OriginHopKind,
} from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { CharacterId } from './character-fields';
import { applyEffectCommand, EffectCommandField, EffectProblem, effectProblem } from './effect-commands';
import type { EffectCommand } from './effect-commands';
import {
  ActiveEffectSchema,
  durationRounds,
  EffectAllyName,
  EffectBadgeValue,
  EffectInstanceId,
  effectRoots,
  EffectRounds,
  EFFECTS_MAX,
  EffectSourceKind,
  effectTerms,
  SELF,
  steppedBadge,
} from './effects';
import type { ActiveEffect, EffectBadgeTerms, EffectContent, EffectTerms } from './effects';
import { applyPlayCommand, FRESH_PLAY } from './play-state';
import { within } from './testing';

const HEROISM = ContentId.parse('00000000-0000-4000-8000-0000000000a1');
const STANCE = ContentId.parse('00000000-0000-4000-8000-0000000000a2');
const INSPIRE = ContentId.parse('00000000-0000-4000-8000-0000000000a3');
const BLESSING = ContentId.parse('00000000-0000-4000-8000-0000000000a4');
const MISSING = ContentId.parse('00000000-0000-4000-8000-0000000000ff');
const FIRST = EffectInstanceId.parse('00000000-0000-4000-8000-000000000001');
const SECOND = EffectInstanceId.parse('00000000-0000-4000-8000-000000000002');

const badge = (value: number): EffectBadgeValue => EffectBadgeValue.parse(value);
const count = (value: number): DurationCount => DurationCount.parse(value);

const CONTENT: EffectContent = new Map<ContentId, EffectTerms>([
  [
    HEROISM,
    { remaining: EffectRounds.parse(6000), expiry: EffectExpiry.TurnStart, sustained: false, badge: undefined },
  ],
  [
    STANCE,
    {
      remaining: undefined,
      expiry: undefined,
      sustained: false,
      badge: { type: EffectBadgeType.Counter, value: badge(1), min: badge(1), max: badge(3), loop: true },
    },
  ],
  [
    INSPIRE,
    {
      remaining: EffectRounds.parse(10),
      expiry: EffectExpiry.TurnEnd,
      sustained: true,
      badge: { type: EffectBadgeType.Formula, formula: DamageFormula.parse('1d4') },
    },
  ],
  [BLESSING, { remaining: undefined, expiry: undefined, sustained: false, badge: undefined }],
]);
const LIMITS = { ...within(HitPoints.parse(10)), effects: CONTENT };

const apply = (id: EffectInstanceId, effect: ContentId, rolled?: number): EffectCommand => ({
  field: EffectCommandField.ApplyEffect,
  id,
  effect,
  source: SELF,
  ...(rolled === undefined ? {} : { rolled: badge(rolled) }),
});

describe('duration conversion', () => {
  test('a minute is 10 rounds, an hour 600 and a day 14,400', () => {
    expect(durationRounds(count(1), DurationUnit.Round)).toBe(EffectRounds.parse(1));
    expect(durationRounds(count(10), DurationUnit.Minute)).toBe(EffectRounds.parse(100));
    expect(durationRounds(count(1), DurationUnit.Hour)).toBe(EffectRounds.parse(600));
    expect(durationRounds(count(1), DurationUnit.Day)).toBe(EffectRounds.parse(14_400));
  });

  test('a timed effect lasts its duration and ends at the start of a turn unless the content says otherwise', () => {
    const timed = effectTerms(
      EffectData.parse({
        category: 'spell',
        duration: { type: 'time', count: 1, unit: DurationUnit.Minute },
      }),
    );
    expect(timed).toMatchObject({ remaining: 10, expiry: EffectExpiry.TurnStart, sustained: false });
  });

  test('a turn effect has no clock but ends at its expiry, and an unlimited one has neither', () => {
    const turn = effectTerms(
      EffectData.parse({
        category: 'spell',
        duration: { type: 'turn', expiry: EffectExpiry.TurnEnd },
      }),
    );
    expect(turn).toMatchObject({ remaining: undefined, expiry: EffectExpiry.TurnEnd });
    const unlimited = effectTerms(EffectData.parse({ category: 'other', duration: { type: 'unlimited' } }));
    expect(unlimited).toMatchObject({ remaining: undefined, expiry: undefined });
  });
});

describe('effect commands', () => {
  test('applyEffect starts the clock and expiry from the content, with the source', () => {
    const play = applyPlayCommand(FRESH_PLAY, apply(FIRST, HEROISM), LIMITS);
    expect(play.effects).toEqual([
      { id: FIRST, effect: HEROISM, source: SELF, remaining: EffectRounds.parse(6000), expiry: EffectExpiry.TurnStart },
    ]);
  });

  test('an ally is recorded as the source', () => {
    const command: EffectCommand = {
      field: EffectCommandField.ApplyEffect,
      id: FIRST,
      effect: BLESSING,
      source: { kind: EffectSourceKind.Ally, name: EffectAllyName.parse('Seoni') },
    };
    expect(applyPlayCommand(FRESH_PLAY, command, LIMITS).effects[0]?.source).toEqual({
      kind: 'ally',
      name: EffectAllyName.parse('Seoni'),
    });
  });

  test('an ally picked from the campaign is recorded with its character', () => {
    const characterId = CharacterId.parse(newId());
    const source = { kind: EffectSourceKind.Ally, name: EffectAllyName.parse('Seoni'), characterId };
    const command: EffectCommand = { field: EffectCommandField.ApplyEffect, id: FIRST, effect: BLESSING, source };
    expect(applyPlayCommand(FRESH_PLAY, command, LIMITS).effects[0]?.source).toEqual(source);
  });

  test('a counter badge starts at the content value and a formula badge at what was rolled', () => {
    const counter = applyPlayCommand(FRESH_PLAY, apply(FIRST, STANCE), LIMITS);
    expect(counter.effects[0]?.badge).toBe(badge(1));
    const rolled = applyPlayCommand(FRESH_PLAY, apply(SECOND, INSPIRE, 3), LIMITS);
    expect(rolled.effects[0]).toMatchObject({ badge: 3, sustained: true, remaining: 10 });
  });

  test('applying an id that is already there changes nothing', () => {
    const once = applyPlayCommand(FRESH_PLAY, apply(FIRST, HEROISM), LIMITS);
    expect(applyPlayCommand(once, apply(FIRST, BLESSING), LIMITS).effects).toEqual(once.effects);
  });

  test('removeEffect drops that instance only', () => {
    const both = applyPlayCommand(
      applyPlayCommand(FRESH_PLAY, apply(FIRST, HEROISM), LIMITS),
      apply(SECOND, BLESSING),
      LIMITS,
    );
    const left = applyPlayCommand(both, { field: EffectCommandField.RemoveEffect, id: FIRST }, LIMITS);
    expect(left.effects.map(({ id }) => id)).toEqual([SECOND]);
  });

  test('setEffectRemaining and setEffectBadge change that instance', () => {
    const start = applyPlayCommand(FRESH_PLAY, apply(FIRST, HEROISM), LIMITS);
    const timed = applyPlayCommand(
      start,
      { field: EffectCommandField.SetEffectRemaining, id: FIRST, remaining: EffectRounds.parse(4) },
      LIMITS,
    );
    const stepped = applyPlayCommand(
      timed,
      { field: EffectCommandField.SetEffectBadge, id: FIRST, value: badge(2) },
      LIMITS,
    );
    expect(stepped.effects[0]).toMatchObject({ remaining: 4, badge: 2 });
  });

  test('setEffectRemaining leaves an effect that has no clock alone', () => {
    const start = applyPlayCommand(FRESH_PLAY, apply(FIRST, STANCE), LIMITS);
    const after = applyPlayCommand(
      start,
      { field: EffectCommandField.SetEffectRemaining, id: FIRST, remaining: EffectRounds.parse(4) },
      LIMITS,
    );
    expect(after.effects[0]?.remaining).toBeUndefined();
  });
});

/** The edit that sets the badge of the effect with id `FIRST` to `value`. */
function setBadge(value: number): EffectCommand {
  return { field: EffectCommandField.SetEffectBadge, id: FIRST, value: badge(value) };
}

/** The badge terms of an unlimited effect with `counter` as its badge. */
function counterOf(counter: object): EffectBadgeTerms | undefined {
  return effectTerms(EffectData.parse({ category: 'spell', duration: { type: 'unlimited' }, badge: counter })).badge;
}

describe('effect problems', () => {
  const held: readonly ActiveEffect[] = [ActiveEffectSchema.parse({ id: FIRST, effect: STANCE, badge: 1 })];

  test('an effect the content lacks is unknown', () => {
    expect(effectProblem([], apply(FIRST, MISSING), CONTENT)).toBe(EffectProblem.Unknown);
  });

  test('a formula badge needs its rolled value, and no other badge takes one', () => {
    expect(effectProblem([], apply(FIRST, INSPIRE), CONTENT)).toBe(EffectProblem.Badge);
    expect(effectProblem([], apply(FIRST, HEROISM, 2), CONTENT)).toBe(EffectProblem.Badge);
    expect(effectProblem([], apply(FIRST, INSPIRE, 2), CONTENT)).toBeUndefined();
  });

  test('an instance the character lacks is missing', () => {
    expect(effectProblem([], { field: EffectCommandField.RemoveEffect, id: FIRST }, CONTENT)).toBe(
      EffectProblem.Missing,
    );
  });

  test('a counter stays within its bounds', () => {
    expect(effectProblem(held, setBadge(3), CONTENT)).toBeUndefined();
    expect(effectProblem(held, setBadge(4), CONTENT)).toBe(EffectProblem.Badge);
    expect(effectProblem(held, setBadge(0), CONTENT)).toBe(EffectProblem.Badge);
  });

  test('a character holds only so many effects', () => {
    const full = [...Array.from({ length: EFFECTS_MAX }).keys()].map((index) => ({
      id: EffectInstanceId.parse(`00000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`),
      effect: BLESSING,
      source: SELF,
    }));
    expect(effectProblem(full, apply(FIRST, BLESSING), CONTENT)).toBe(EffectProblem.Full);
    expect(applyEffectCommand(full, apply(FIRST, BLESSING), CONTENT)).toHaveLength(EFFECTS_MAX + 1);
  });
});

describe('counter badges', () => {
  const terms = { type: EffectBadgeType.Counter, value: badge(1), min: badge(1), max: badge(3), loop: false } as const;

  test('step within the bounds and hold at them', () => {
    expect(steppedBadge(terms, badge(1), true)).toBe(badge(2));
    expect(steppedBadge(terms, badge(3), true)).toBe(badge(3));
    expect(steppedBadge(terms, badge(1), false)).toBe(badge(1));
  });

  test('loop past a bound when the content says so', () => {
    const looping = { ...terms, loop: true };
    expect(steppedBadge(looping, badge(3), true)).toBe(badge(1));
    expect(steppedBadge(looping, badge(1), false)).toBe(badge(3));
  });
});

describe('effectRoots', () => {
  test('each effect is a root behind an effect hop', () => {
    expect(effectRoots([ActiveEffectSchema.parse({ id: FIRST, effect: HEROISM })])).toEqual([
      { entry: HEROISM, hop: { kind: OriginHopKind.Effect, effect: HEROISM } },
    ]);
  });
});

describe('counter terms from content', () => {
  test('a counter counts from 1 and has no end unless the content gives one', () => {
    expect(counterOf({ type: 'counter', value: 1 })).toMatchObject({ min: 1, max: undefined, loop: false });
  });

  test('labels set the last step, counting from the floor', () => {
    expect(counterOf({ type: 'counter', value: 1, labels: ['5 ft.', '10 ft.', '15 ft.'] })).toMatchObject({
      min: 1,
      max: 3,
    });
  });

  test('a stated bound wins', () => {
    expect(counterOf({ type: 'counter', value: 2, min: 0, max: 5, loop: true })).toMatchObject({
      min: 0,
      max: 5,
      loop: true,
    });
  });
});
