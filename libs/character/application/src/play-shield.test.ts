import { describe, expect, test } from 'bun:test';

import {
  addItem,
  EMPTY_INVENTORY,
  FRESH_PLAY,
  InventoryItemId,
  ItemQuantity,
  PlayCommandField,
  untypedDamage,
} from '@pioneer/character/domain';
import type { Inventory, PlayCommand, PlayState, ShieldContent } from '@pioneer/character/domain';
import { ContentId, Hardness, HitPoints } from '@pioneer/rules/sdk';
import { ValidationError } from '@pioneer/shared/kernel';

import { checkShield, shieldInventoryAfter } from './play-shield';

const ITEM = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const SHIELDS: ShieldContent = new Map([
  [ITEM, { hardness: Hardness.parse(5), hitPoints: HitPoints.parse(20), brokenThreshold: HitPoints.parse(10) }],
]);
const INVENTORY: Inventory = addItem(EMPTY_INVENTORY, {
  id: ITEM,
  item: ContentId.parse('00000000-0000-4000-8000-0000000000aa'),
  quantity: ItemQuantity.parse(1),
  container: undefined,
});

function blocking(taken: number): PlayCommand {
  return { field: PlayCommandField.BlockWithShield, item: ITEM, damage: untypedDamage(HitPoints.parse(taken)) };
}

function worn(damage: number): PlayState {
  return { ...FRESH_PLAY, shields: { [ITEM]: HitPoints.parse(damage) } };
}

describe('checkShield', () => {
  test('lets a whole shield block', () => {
    expect(() => {
      checkShield(FRESH_PLAY, blocking(8), SHIELDS);
    }).not.toThrow();
  });

  test('refuses a broken shield', () => {
    expect(() => {
      checkShield(worn(12), blocking(8), SHIELDS);
    }).toThrow(ValidationError);
  });

  test('refuses a shield the character does not hold', () => {
    expect(() => {
      checkShield(FRESH_PLAY, blocking(8), new Map());
    }).toThrow(ValidationError);
  });
});

describe('shieldInventoryAfter', () => {
  test('leaves the inventory alone while the shield stays whole', () => {
    expect(shieldInventoryAfter(INVENTORY, FRESH_PLAY, { command: blocking(8), shields: SHIELDS })).toBeUndefined();
  });

  test('marks the shield broken once it falls to its Broken Threshold', () => {
    const after = shieldInventoryAfter(INVENTORY, worn(4), { command: blocking(11), shields: SHIELDS });
    expect(after?.items[0]?.broken).toBe(true);
  });

  test('removes the shield when it is destroyed', () => {
    const after = shieldInventoryAfter(INVENTORY, worn(4), { command: blocking(40), shields: SHIELDS });
    expect(after?.items).toStrictEqual([]);
  });
});
