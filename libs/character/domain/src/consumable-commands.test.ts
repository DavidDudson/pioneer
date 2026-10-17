import { describe, expect, test } from 'bun:test';

import { ContentId, HitPoints } from '@pioneer/rules/sdk';

import {
  afterConsumable,
  ConsumableCommandField,
  consumableInventoryAfter,
  ConsumableProblem,
  consumableProblem,
} from './consumable-commands';
import type { ConsumableCommand, HeldConsumable } from './consumable-commands';
import { EffectInstanceId } from './effects';
import type { EffectContent, EffectTerms } from './effects';
import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { currentHitPoints, FRESH_PLAY } from './play-state';
import { SpendCount, SpendId, SpendKind } from './spend-log';
import { within } from './testing';

const ITEM = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const POTION = ContentId.parse('00000000-0000-4000-8000-0000000000a1');
const BOOST = ContentId.parse('00000000-0000-4000-8000-0000000000e1');
const OTHER = ContentId.parse('00000000-0000-4000-8000-0000000000a2');
const SPEND_ID = SpendId.parse('00000000-0000-4000-8000-0000000000b1');
const EFFECT_ID = EffectInstanceId.parse('00000000-0000-4000-8000-0000000000c1');
const MAX = HitPoints.parse(30);

const HELD: HeldConsumable = { entry: POTION, quantity: ItemQuantity.parse(2), effect: BOOST };

function using(change: Partial<ConsumableCommand> = {}): ConsumableCommand {
  return {
    field: ConsumableCommandField.UseConsumable,
    item: ITEM,
    spend: { id: SPEND_ID, action: POTION, cost: { kind: SpendKind.Actions, count: SpendCount.parse(1) } },
    ...change,
  };
}

function stack(quantity: number): Inventory {
  return addItem(EMPTY_INVENTORY, {
    id: ITEM,
    item: POTION,
    quantity: ItemQuantity.parse(quantity),
    container: undefined,
  });
}

describe('consumableProblem', () => {
  test('lets a held consumable be used', () => {
    expect(consumableProblem(using(), HELD)).toBeUndefined();
  });

  test('refuses an item that is not a consumable the character holds', () => {
    expect(consumableProblem(using(), undefined)).toBe(ConsumableProblem.NotHeld);
  });

  test('refuses a spend for another action', () => {
    const spend = { ...using().spend, action: OTHER };
    expect(consumableProblem(using({ spend }), HELD)).toBe(ConsumableProblem.WrongAction);
  });

  test('refuses an effect the consumable does not give', () => {
    const effect = { id: EFFECT_ID, effect: OTHER };
    expect(consumableProblem(using({ effect }), HELD)).toBe(ConsumableProblem.WrongEffect);
  });

  test('lets the effect the consumable gives be applied', () => {
    const effect = { id: EFFECT_ID, effect: BOOST };
    expect(consumableProblem(using({ effect }), HELD)).toBeUndefined();
  });
});

describe('consumableInventoryAfter', () => {
  test('takes one from a stack', () => {
    expect<number | undefined>(consumableInventoryAfter(stack(3), ITEM).items[0]?.quantity).toBe(2);
  });

  test('removes the item once the last one is used', () => {
    expect(consumableInventoryAfter(stack(1), ITEM).items).toStrictEqual([]);
  });

  test('leaves the inventory alone for an item it lacks', () => {
    expect(
      consumableInventoryAfter(stack(1), InventoryItemId.parse('00000000-0000-4000-8000-0000000000ff')),
    ).toStrictEqual(stack(1));
  });
});

describe('afterConsumable', () => {
  const terms: EffectTerms = { remaining: undefined, expiry: undefined, sustained: false, badge: undefined };
  const limits = { ...within(MAX), effects: new Map([[BOOST, terms]]) as EffectContent };
  const hurt = { ...FRESH_PLAY, hp: { damage: HitPoints.parse(20), temp: HitPoints.parse(0) } };

  test('logs the spend', () => {
    expect(afterConsumable(FRESH_PLAY, using(), limits).spendLog.map(({ id }) => id)).toStrictEqual([SPEND_ID]);
  });

  test('applies the effect the consumable gives', () => {
    const after = afterConsumable(FRESH_PLAY, using({ effect: { id: EFFECT_ID, effect: BOOST } }), limits);
    expect(after.effects.map(({ effect }) => effect)).toStrictEqual([BOOST]);
  });

  test('restores the Hit Points it heals, up to the maximum', () => {
    const healed = afterConsumable(hurt, using({ heal: HitPoints.parse(8) }), limits);
    expect<number>(currentHitPoints(healed.hp, MAX)).toBe(18);
    const overhealed = afterConsumable(hurt, using({ heal: HitPoints.parse(99) }), limits);
    expect(currentHitPoints(overhealed.hp, MAX)).toBe(MAX);
  });
});
