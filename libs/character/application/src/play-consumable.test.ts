import { describe, expect, test } from 'bun:test';

import {
  addItem,
  ConsumableCommandField,
  EffectInstanceId,
  EMPTY_INVENTORY,
  FRESH_PLAY,
  InventoryItemId,
  ItemQuantity,
  SpendCount,
  SpendId,
  SpendKind,
} from '@pioneer/character/domain';
import type { ConsumableCommand, EffectContent, Inventory } from '@pioneer/character/domain';
import { ContentId } from '@pioneer/rules/sdk';
import { ValidationError } from '@pioneer/shared/kernel';

import { checkEffect } from './play-checks';
import { consumableInventory } from './play-consumable';

const ITEM = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const POTION = ContentId.parse('00000000-0000-4000-8000-0000000000a1');
const BOOST = ContentId.parse('00000000-0000-4000-8000-0000000000e1');
const EFFECT_ID = EffectInstanceId.parse('00000000-0000-4000-8000-0000000000c1');
const NO_EFFECTS: EffectContent = new Map();

function stack(quantity: number): Inventory {
  return addItem(EMPTY_INVENTORY, {
    id: ITEM,
    item: POTION,
    quantity: ItemQuantity.parse(quantity),
    container: undefined,
  });
}

function using(change: Partial<ConsumableCommand> = {}): ConsumableCommand {
  return {
    field: ConsumableCommandField.UseConsumable,
    item: ITEM,
    spend: {
      id: SpendId.parse('00000000-0000-4000-8000-0000000000b1'),
      action: POTION,
      cost: { kind: SpendKind.Actions, count: SpendCount.parse(1) },
    },
    ...change,
  };
}

describe('consumableInventory', () => {
  test('takes one from the stack', () => {
    expect(consumableInventory(stack(3), using())?.items[0]?.quantity).toBe(2);
  });

  test('removes the item once the last one is used', () => {
    expect(consumableInventory(stack(1), using())?.items).toStrictEqual([]);
  });
});

describe('checkEffect for a consumable', () => {
  test('refuses an effect the content does not have', () => {
    const command = using({ effect: { id: EFFECT_ID, effect: BOOST } });
    expect(() => {
      checkEffect(FRESH_PLAY, command, NO_EFFECTS);
    }).toThrow(ValidationError);
  });

  test('leaves a use with no effect alone', () => {
    expect(() => {
      checkEffect(FRESH_PLAY, using(), NO_EFFECTS);
    }).not.toThrow();
  });
});
