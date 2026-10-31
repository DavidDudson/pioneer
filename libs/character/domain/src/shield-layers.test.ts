import { describe, expect, test } from 'bun:test';

import { ContentId, Hardness, HitPoints } from '@pioneer/rules/sdk';

import { ActiveEffectSchema, EffectBadgeValue, EffectInstanceId } from './effects';
import { InventoryItemId } from './inventory';
import { applyPlayCommand, currentHitPoints, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { ShieldLayers } from './shield-commands';
import type { ShieldStats } from './shield-commands';
import { within } from './testing';
import { untypedDamage } from './untyped-damage';

const MAX = HitPoints.parse(30);
const ITEM = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');

function hp(value: number): HitPoints {
  return HitPoints.parse(value);
}

describe('Shield Block with a shield of layers', () => {
  const EFFECT = ContentId.parse('00000000-0000-4000-8000-0000000000e3');
  const LAYERED: ShieldStats = {
    hardness: Hardness.parse(5),
    hitPoints: HitPoints.parse(0),
    brokenThreshold: HitPoints.parse(0),
    undamageable: true,
    granted: {
      effect: EFFECT,
      endsOnBlock: false,
      endsWhenDestroyed: false,
      raised: true,
      layered: true,
      recreatedOnSustain: false,
    },
  };
  const withBadge = (badge: number | undefined): PlayState => ({
    ...FRESH_PLAY,
    effects: [
      ActiveEffectSchema.parse({
        id: EffectInstanceId.parse('00000000-0000-4000-8000-0000000000a3'),
        effect: EFFECT,
        ...(badge === undefined ? {} : { badge }),
      }),
    ],
  });
  const blockBreaking = (play: PlayState, layers?: number): PlayState =>
    applyPlayCommand(
      play,
      {
        field: PlayCommandField.BlockWithShield,
        item: ITEM,
        damage: untypedDamage(hp(20)),
        ...(layers === undefined ? {} : { layers: ShieldLayers.parse(layers) }),
      },
      { ...within(MAX), shields: new Map([[ITEM, LAYERED]]) },
    );

  test.each([
    [1, 5],
    [2, 7],
    [3, 10],
  ])('breaking %p layers gives Hardness %p', (layers, hardness) => {
    const after = blockBreaking(withBadge(3), layers);

    expect(currentHitPoints(after.hp, MAX)).toBe(hp(30 - (20 - hardness)));
  });

  test('a block breaks one layer unless it says more, and the effect counts the rest', () => {
    expect(blockBreaking(withBadge(3)).effects.map(({ badge }) => badge)).toStrictEqual([EffectBadgeValue.parse(2)]);
    expect(blockBreaking(withBadge(3), 2).effects.map(({ badge }) => badge)).toStrictEqual([EffectBadgeValue.parse(1)]);
  });

  test('an effect that has not counted yet has all its layers', () => {
    expect(blockBreaking(withBadge(undefined), 2).effects.map(({ badge }) => badge)).toStrictEqual([
      EffectBadgeValue.parse(1),
    ]);
  });

  test('the effect ends with its last layer, and a block never breaks more than are left', () => {
    expect(blockBreaking(withBadge(1)).effects).toStrictEqual([]);
    expect(blockBreaking(withBadge(2), 3).effects).toStrictEqual([]);
  });
});
