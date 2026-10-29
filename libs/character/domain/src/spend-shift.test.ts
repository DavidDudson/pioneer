import { describe, expect, test } from 'bun:test';

import { ContentId, HitPoints, RollOption } from '@pioneer/rules/sdk';

import { EffectInstanceId, EffectRounds, SELF } from './effects';
import type { ActiveEffect } from './effects';
import { applyPlayCommand, PlayCommandField } from './play-state';
import type { PlayLimits, PlayState } from './play-state';
import { ResourceCount } from './resource-count';
import { Resource } from './resources';
import { spendRefusal } from './spend-commands';
import { SpendCommandField, SpendProblem } from './spend-log';
import type { FormShift, SpendCommand } from './spend-log';
import { actions, OWN_TURN, playIn, Serial, spendId, spendOf } from './spend-log-testing';
import type { SpendAction } from './spend-log-testing';
import { TEST_SPEND, within } from './testing';

const FIRST = Serial.parse(1);
const FORM = EffectInstanceId.parse('11111111-1111-4111-8111-111111111111');
const OTHER = EffectInstanceId.parse('22222222-2222-4222-8222-222222222222');
const BEAR = ContentId.parse('33333333-3333-4333-8333-333333333333');
const PLANT = ContentId.parse('44444444-4444-4444-8444-444444444444');
const GRIZZLY = RollOption.parse('bear-form:grizzly');
const LIMITS: PlayLimits = {
  ...within(HitPoints.parse(10)),
  counted: { slots: new Map(), uses: new Map() },
  spend: TEST_SPEND,
};

const BEAR_FORM: ActiveEffect = {
  id: FORM,
  effect: BEAR,
  source: SELF,
  remaining: EffectRounds.parse(40),
  form: GRIZZLY,
  tempHp: HitPoints.parse(5),
};

const REFUSAL_LIMITS = {
  counted: LIMITS.counted,
  points: { [Resource.HeroPoints]: ResourceCount.parse(1), [Resource.FocusPoints]: ResourceCount.parse(1) },
};

function playWith(...effects: ActiveEffect[]): PlayState {
  return { ...playIn(OWN_TURN), effects };
}

function shiftTo(shift: FormShift): SpendAction {
  return { ...spendOf(FIRST, actions(1)), shift };
}

const PLANT_FORM: ActiveEffect = { id: FORM, effect: PLANT, source: SELF, tempHp: HitPoints.parse(8) };

describe('a spend that shifts a form', () => {
  const plant: FormShift = { effect: FORM, to: PLANT, tempHp: HitPoints.parse(8) };

  test('changes the form of the effect and keeps its time left', () => {
    const play = applyPlayCommand(playWith(BEAR_FORM), shiftTo(plant), LIMITS);
    expect(play.effects).toStrictEqual([
      { id: FORM, effect: PLANT, source: SELF, remaining: EffectRounds.parse(40), tempHp: HitPoints.parse(8) },
    ]);
    expect(play.spendLog[0]?.shifted).toStrictEqual(BEAR_FORM);
  });

  test('is refused when the effect is not on the character', () => {
    expect(spendRefusal(playWith(), shiftTo(plant), REFUSAL_LIMITS)).toBe(SpendProblem.NoSuchEffect);
  });

  test('puts the old form back when the spend is undone, with the time left now', () => {
    const shifted = applyPlayCommand(playWith(BEAR_FORM), shiftTo(plant), LIMITS);
    const later: PlayState = { ...shifted, effects: [{ ...PLANT_FORM, remaining: EffectRounds.parse(30) }] };
    const play = applyPlayCommand(later, { field: PlayCommandField.UndoSpend, id: spendId(FIRST) }, LIMITS);
    expect(play.effects).toStrictEqual([{ ...BEAR_FORM, remaining: EffectRounds.parse(30) }]);
    expect(play.spendLog).toStrictEqual([]);
  });

  test('cannot be undone once the effect is gone', () => {
    const shifted = applyPlayCommand(playWith(BEAR_FORM), shiftTo(plant), LIMITS);
    const gone: PlayState = { ...shifted, effects: [{ ...BEAR_FORM, id: OTHER }] };
    const undo: SpendCommand = { field: SpendCommandField.UndoSpend, id: spendId(FIRST) };
    expect(spendRefusal(gone, undo, REFUSAL_LIMITS)).toBe(SpendProblem.NoSuchEffect);
  });
});
