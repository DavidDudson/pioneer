import { describe, expect, test } from 'bun:test';

import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { ContentId, EffectExpiry, HitPoints, RollOption } from '@pioneer/rules/sdk';
import { assert, integer, property } from 'fast-check';

import { EffectCommandField } from './effect-commands';
import type { EffectCommand } from './effect-commands';
import { applyEffectEdit, endEffects } from './effect-ending';
import type { EffectPlay } from './effect-ending';
import { EffectInstanceId, EffectRounds, SELF } from './effects';
import type { EffectContent } from './effects';
import { FRESH_PLAY } from './play-state';
import { within } from './testing';
import { startTurn } from './turn-start';

const DRAGON = ContentId.parse('00000000-0000-4000-8000-0000000000d1');
const PLANT = ContentId.parse('00000000-0000-4000-8000-0000000000d2');
const HEROISM = ContentId.parse('00000000-0000-4000-8000-0000000000d3');
const FIRST = EffectInstanceId.parse('00000000-0000-4000-8000-000000000001');
const SECOND = EffectInstanceId.parse('00000000-0000-4000-8000-000000000002');
const BOON = EffectInstanceId.parse('00000000-0000-4000-8000-000000000003');
const ARBOREAL = RollOption.parse('plant-form:arboreal');
const TEMP = HitPoints.parse(12);
const NONE = HitPoints.parse(0);
const ONE_MINUTE = EffectRounds.parse(10);
const ONE_ROUND = EffectRounds.parse(1);
const LAPSING: EffectContent = new Map([
  [
    PLANT,
    { remaining: ONE_ROUND, expiry: EffectExpiry.TurnStart, sustained: false, badge: undefined, polymorph: true },
  ],
]);
const MAX = HitPoints.parse(100);

const CONTENT: EffectContent = new Map([
  [
    DRAGON,
    { remaining: ONE_MINUTE, expiry: EffectExpiry.TurnStart, sustained: false, badge: undefined, polymorph: true },
  ],
  [
    PLANT,
    { remaining: ONE_MINUTE, expiry: EffectExpiry.TurnStart, sustained: false, badge: undefined, polymorph: true },
  ],
  [HEROISM, { remaining: undefined, expiry: undefined, sustained: false, badge: undefined, polymorph: false }],
]);

const START: EffectPlay = { effects: [], hp: { damage: NONE, temp: NONE } };

function apply(
  id: EffectInstanceId,
  effect: ContentId,
  more: { readonly form?: RollOption; readonly tempHp?: HitPoints } = {},
): EffectCommand {
  return { field: EffectCommandField.ApplyEffect, id, effect, source: SELF, ...more };
}

function remove(id: EffectInstanceId): EffectCommand {
  return { field: EffectCommandField.RemoveEffect, id };
}

describe('applying a form', () => {
  test('keeps the chosen form and the temporary Hit Points it gave, and credits them to the character', () => {
    const play = applyEffectEdit(START, apply(FIRST, PLANT, { form: ARBOREAL, tempHp: TEMP }), CONTENT);

    expect(play.effects).toMatchObject([{ id: FIRST, effect: PLANT, form: ARBOREAL, tempHp: TEMP }]);
    expect(play.hp.temp).toBe(TEMP);
  });

  test('a form that gives no temporary Hit Points records none', () => {
    const play = applyEffectEdit(START, apply(FIRST, DRAGON, { tempHp: NONE }), CONTENT);

    expect(play.effects[0]?.tempHp).toBeUndefined();
  });

  test('a newer polymorph effect ends the one before it, with its temporary Hit Points', () => {
    const wild = applyEffectEdit(START, apply(FIRST, PLANT, { form: ARBOREAL, tempHp: TEMP }), CONTENT);
    const dragon = applyEffectEdit(wild, apply(SECOND, DRAGON), CONTENT);

    expect(dragon.effects.map(({ id }) => id)).toStrictEqual([SECOND]);
    expect(dragon.hp.temp).toBe(NONE);
  });

  test('a newer form keeps the better temporary Hit Points of the two', () => {
    const wild = applyEffectEdit(START, apply(FIRST, PLANT, { tempHp: TEMP }), CONTENT);
    const dragon = applyEffectEdit(wild, apply(SECOND, DRAGON, { tempHp: HitPoints.parse(20) }), CONTENT);

    expect(dragon.hp.temp).toBe(HitPoints.parse(20));
  });

  test('effects without the trait stay when a form replaces another', () => {
    const boon = applyEffectEdit(START, apply(BOON, HEROISM), CONTENT);
    const wild = applyEffectEdit(boon, apply(FIRST, PLANT), CONTENT);
    const dragon = applyEffectEdit(wild, apply(SECOND, DRAGON), CONTENT);

    expect(dragon.effects.map(({ id }) => id)).toStrictEqual([BOON, SECOND]);
  });
});

describe('ending a form', () => {
  test('Dismiss removes the effect and the temporary Hit Points it gave', () => {
    const wild = applyEffectEdit(START, apply(FIRST, PLANT, { form: ARBOREAL, tempHp: TEMP }), CONTENT);

    expect(applyEffectEdit(wild, remove(FIRST), CONTENT)).toStrictEqual(START);
  });

  test('temporary Hit Points the form took damage from are gone with it', () => {
    const wild = applyEffectEdit(START, apply(FIRST, PLANT, { tempHp: TEMP }), CONTENT);
    const hurt = { ...wild, hp: { ...wild.hp, temp: HitPoints.parse(3) } };

    expect(endEffects(hurt, [FIRST]).hp.temp).toBe(NONE);
  });

  test('temporary Hit Points from another source, above what the form gave, stay', () => {
    const wild = applyEffectEdit(START, apply(FIRST, PLANT, { tempHp: TEMP }), CONTENT);
    const more = { ...wild, hp: { ...wild.hp, temp: HitPoints.parse(30) } };

    expect(endEffects(more, [FIRST]).hp.temp).toBe(HitPoints.parse(30));
  });

  test('expiry at a turn start takes the temporary Hit Points back', () => {
    const wild = applyEffectEdit(START, apply(FIRST, PLANT, { tempHp: TEMP }), LAPSING);
    const { play } = startTurn(
      { ...FRESH_PLAY, ...wild, effects: [...wild.effects] },
      { limits: { ...within(MAX), effects: LAPSING }, recovery: [] },
      scriptedRandom([]),
    );

    expect(play.effects).toStrictEqual([]);
    expect(play.hp.temp).toBe(NONE);
  });
});

/** Temporary Hit Points of `amount`, which the character already had before any form. */
function holding(amount: number): EffectPlay {
  return { effects: [], hp: { damage: NONE, temp: HitPoints.parse(amount) } };
}

const LOW = { min: 0, max: 19 } as const;
const HIGH = { min: 20, max: 40 } as const;

describe('applying then ending a form', () => {
  test('a form that raised the temporary Hit Points takes them back, and leaves the effects as before', () => {
    assert(
      property(integer(LOW), integer(HIGH), (before, given) => {
        const form = applyEffectEdit(holding(before), apply(FIRST, PLANT, { tempHp: HitPoints.parse(given) }), CONTENT);
        const ended = applyEffectEdit(form, remove(FIRST), CONTENT);

        expect(ended.effects).toStrictEqual([]);
        expect(ended.hp.temp).toBe(NONE);
      }),
    );
  });

  test('a form that raised nothing leaves the temporary Hit Points as they were', () => {
    assert(
      property(integer(HIGH), integer(LOW), (before, given) => {
        const form = applyEffectEdit(holding(before), apply(FIRST, PLANT, { tempHp: HitPoints.parse(given) }), CONTENT);
        const ended = applyEffectEdit(form, remove(FIRST), CONTENT);

        expect(ended).toStrictEqual(holding(before));
      }),
    );
  });
});
