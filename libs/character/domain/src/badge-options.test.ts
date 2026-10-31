import { describe, expect, test } from 'bun:test';

import { entry, idOf, lookupOf } from '@pioneer/rules/grants/testing';
import { ContentKind, RollOption } from '@pioneer/rules/sdk';

import { ActiveEffectSchema, badgeOptions, EffectInstanceId } from './effects';
import type { ActiveEffect } from './effects';

const AMPED = { ...entry('spell-effect-amped'), kind: ContentKind.Effect };
const PLAIN = { ...entry('spell-effect-plain'), kind: ContentKind.Effect };
const LOOKUP = lookupOf([AMPED, PLAIN]);

function active(name: string, badge?: number): ActiveEffect {
  return ActiveEffectSchema.parse({
    id: EffectInstanceId.parse('00000000-0000-4000-8000-0000000000b1'),
    effect: idOf(name),
    ...(badge === undefined ? {} : { badge }),
  });
}

describe('badgeOptions', () => {
  test('an effect whose badge shows a number sets an option with it', () => {
    expect(badgeOptions([active('spell-effect-amped', 3)], LOOKUP)).toStrictEqual([
      RollOption.parse('self:effect:spell-effect-amped:badge:3'),
    ]);
  });

  test('the option follows the badge as it counts down', () => {
    expect(badgeOptions([active('spell-effect-amped', 2)], LOOKUP)).toStrictEqual([
      RollOption.parse('self:effect:spell-effect-amped:badge:2'),
    ]);
  });

  test('an effect without a badge, or one the content lacks, sets nothing', () => {
    expect(badgeOptions([active('spell-effect-plain'), active('spell-effect-missing', 1)], LOOKUP)).toStrictEqual([]);
  });
});
