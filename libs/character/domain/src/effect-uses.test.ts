import { describe, expect, test } from 'bun:test';

import { ContentId, EffectDurationType, EffectExpiry, HitPoints } from '@pioneer/rules/sdk';
import type { EffectData } from '@pioneer/rules/sdk';
import { assert, integer, property } from 'fast-check';

import { EffectCommandField, EffectProblem, effectProblem } from './effect-commands';
import type { EffectCommand } from './effect-commands';
import { applyEffectEdit } from './effect-ending';
import type { EffectPlay } from './effect-ending';
import { EffectInstanceId, effectTerms, EffectUses, SELF } from './effects';
import type { EffectContent } from './effects';

const BLESSING = ContentId.parse('00000000-0000-4000-8000-0000000000e1');
const HEROISM = ContentId.parse('00000000-0000-4000-8000-0000000000e2');
const FIRST = EffectInstanceId.parse('00000000-0000-4000-8000-000000000011');
const NONE = HitPoints.parse(0);
const THREE = EffectUses.parse(3);
const USES_MAX = 20;
const SPENDS_MAX = 40;

const CONTENT: EffectContent = new Map([
  [
    BLESSING,
    { remaining: undefined, uses: THREE, expiry: undefined, sustained: false, badge: undefined, polymorph: false },
  ],
  [HEROISM, { remaining: undefined, expiry: undefined, sustained: false, badge: undefined, polymorph: false }],
]);

const START: EffectPlay = { effects: [], hp: { damage: NONE, temp: NONE } };

function apply(effect: ContentId): EffectCommand {
  return { field: EffectCommandField.ApplyEffect, id: FIRST, effect, source: SELF };
}

const SPEND: EffectCommand = { field: EffectCommandField.SpendEffectUse, id: FIRST };

/** `play` after `times` spends of the boon, however many it has. */
function spendTimes(play: EffectPlay, times: number, content: EffectContent): EffectPlay {
  let current = play;
  for (let spent = 0; spent < times; spent += 1) {
    current = applyEffectEdit(current, SPEND, content);
  }
  return current;
}

describe('a boon with uses', () => {
  test('starts with the uses its duration names and no clock', () => {
    const data = { duration: { type: EffectDurationType.Uses, count: 3 } } as EffectData;

    expect(effectTerms(data)).toMatchObject({ remaining: undefined, uses: 3, expiry: undefined });
  });

  test('takes its uses from the content when applied', () => {
    const play = applyEffectEdit(START, apply(BLESSING), CONTENT);

    expect(play.effects).toMatchObject([{ id: FIRST, effect: BLESSING, uses: 3 }]);
  });

  test('counts down one use at a time', () => {
    const once = applyEffectEdit(applyEffectEdit(START, apply(BLESSING), CONTENT), SPEND, CONTENT);

    expect(once.effects).toMatchObject([{ id: FIRST, uses: 2 }]);
  });

  test('ends when the last use is spent', () => {
    const spent = spendTimes(applyEffectEdit(START, apply(BLESSING), CONTENT), THREE, CONTENT);

    expect(spent.effects).toStrictEqual([]);
  });

  test('refuses a spend on an effect that is not there or has no uses', () => {
    const plain = applyEffectEdit(START, apply(HEROISM), CONTENT);

    expect(effectProblem(START.effects, SPEND, CONTENT)).toBe(EffectProblem.Missing);
    expect(effectProblem(plain.effects, SPEND, CONTENT)).toBe(EffectProblem.NoUses);
  });

  test('is left as it was when spending an effect with no uses', () => {
    const plain = applyEffectEdit(START, apply(HEROISM), CONTENT);

    expect(applyEffectEdit(plain, SPEND, CONTENT).effects).toStrictEqual(plain.effects);
  });

  test('never goes below zero or above what it started with, however many spends are tried', () => {
    assert(
      property(integer({ min: 1, max: USES_MAX }), integer({ min: 0, max: SPENDS_MAX }), (start, spends) => {
        const content: EffectContent = new Map([
          [
            BLESSING,
            {
              remaining: undefined,
              uses: EffectUses.parse(start),
              expiry: EffectExpiry.TurnStart,
              sustained: false,
              badge: undefined,
              polymorph: false,
            },
          ],
        ]);
        const after = spendTimes(applyEffectEdit(START, apply(BLESSING), content), spends, content);
        const left = Math.max(start - spends, 0);

        expect(after.effects.map(({ uses }) => Number(uses))).toStrictEqual(
          Array.from({ length: Number(left > 0) }, () => left),
        );
      }),
    );
  });
});
