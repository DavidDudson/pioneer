import { describe, expect, test } from 'bun:test';

import { DefenceStatusKind } from '@pioneer/rules/engine';
import { Size } from '@pioneer/rules/sdk';

import { chosen, formRulesOf, viewOf } from './testing/battle-forms';
import type { FormView } from './testing/battle-forms';

const LEVEL = 10;

/** The druid in Dragon Form as the dragon `type` (the pick of its Dragon Form spell), cast at `rank`. */
function dragon(type: string, rank: number): FormView {
  return viewOf(formRulesOf('effect:spell-effect-dragon-form', rank), chosen(`dragon-form:${type}`));
}

function resistances(view: FormView): unknown {
  return view.defences.resistances
    .filter(({ status }) => status.kind === DefenceStatusKind.Applied)
    .map(({ type, value }) => [type, value]);
}

describe('Player Core: Dragon Form, level 10 druid', () => {
  test('6th rank brine dragon: Large, AC 18 + level, 10 temporary HP, Athletics +23, Speed 40, fly 100, swim 60', () => {
    const form = dragon('brine', 6);

    expect(form.size).toBe(Size.Large);
    expect(form.total('ac')).toBe(18 + LEVEL);
    expect(form.temporaryHitPoints).toBe(10);
    expect(form.total('skill:athletics')).toBe(23);
    expect(form.total('speed:land')).toBe(40);
    expect(form.total('speed:fly')).toBe(100);
    expect(form.total('speed:swim')).toBe(60);
  });

  test('the dragon type gives its resistance and the speeds that type has, and no others', () => {
    expect(resistances(dragon('brine', 6))).toEqual([['bludgeoning', 10]]);
    expect(resistances(dragon('magma', 6))).toEqual([['fire', 10]]);
    expect(dragon('magma', 6).total('speed:burrow')).toBe(20);
    expect(dragon('magma', 6).total('speed:swim')).toBe(0);
    expect(dragon('cinder', 6).total('speed:burrow')).toBe(0);
  });

  test('8th rank: Huge, 15 temporary HP, Athletics +28, fly 120, and the type’s speeds stay', () => {
    const form = dragon('magma', 8);

    expect(form.size).toBe(Size.Huge);
    expect(form.temporaryHitPoints).toBe(15);
    expect(form.total('skill:athletics')).toBe(28);
    expect(form.total('speed:fly')).toBe(120);
    expect(form.total('speed:burrow')).toBe(20);
    expect(resistances(form)).toEqual([['fire', 10]]);
  });

  test('without a pick the form has the speeds and resistance of no dragon type', () => {
    const form = viewOf(formRulesOf('effect:spell-effect-dragon-form', 6), chosen());

    expect(resistances(form)).toEqual([]);
    expect(form.total('speed:swim')).toBe(0);
  });
});
