import { addItem, InventoryItemId, ItemQuantity } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { ContentId, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { EaseEffect } from '@pioneer/rules/ui';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { conditionEaseOptions } from './sheet-condition-options';

const STACK = InventoryItemId.parse('00000000-0000-4000-8000-0000000000a1');
const TWO = ItemQuantity.parse(2);
const NOW = Temporal.Instant.from('2026-01-01T00:00:00Z');

const pack = new ContentPackBuilder().withId('ease').withCondition('wobbly').withCondition('dizzy');
const wobbly = (): ContentId => ContentId.parse(pack.idOf(ContentKind.Condition, 'wobbly'));
const dizzy = (): ContentId => ContentId.parse(pack.idOf(ContentKind.Condition, 'dizzy'));
pack.withItem(ContentKind.Consumable, 'steadying-tonic', {
  category: 'elixir',
  bulk: 'light',
  removesConditions: [{ condition: wobbly(), effect: EaseEffect.Lower, by: 2 }],
});
const registry = new ContentRegistry();
registry.register(pack.build());
const TONIC = ContentId.parse(pack.idOf(ContentKind.Consumable, 'steadying-tonic'));

/** A character carrying `quantity` steadying tonics, or none. */
function carrying(quantity: ItemQuantity | undefined): Character {
  const built = new CharacterBuilder().build();
  return quantity === undefined
    ? built
    : built.withInventory(
        addItem(built.document.inventory, { id: STACK, item: TONIC, quantity, container: undefined }),
        NOW,
      );
}

describe(conditionEaseOptions, () => {
  it('offers a consumable the character carries that lowers the condition, with how many are left', () => {
    const [option] = conditionEaseOptions(registry, carrying(TWO), wobbly());

    expect(option).toMatchObject({
      source: { id: TONIC },
      effect: EaseEffect.Lower,
      by: 2,
      available: true,
      left: TWO,
    });
  });

  it('offers nothing when the character carries none of what eases it', () => {
    expect(conditionEaseOptions(registry, carrying(undefined), wobbly())).toStrictEqual([]);
  });

  it('offers nothing for a condition no entry declares it eases', () => {
    expect(conditionEaseOptions(registry, carrying(TWO), dizzy())).toStrictEqual([]);
  });
});
