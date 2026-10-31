import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, installRulesFakes } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { NO_ENCUMBRANCE } from './encumbered-roots';
import { equippedRules } from './equipped';
import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import { slotContent } from './slot-offer';
import { CharacterBuilder, ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry } from './testing';

installRulesFakes();

const content = itemFixtureContent();
const OVER_THE_LIMIT = ItemQuantity.parse(3);
const OVER_THE_MAXIMUM = ItemQuantity.parse(10);

/** A character carrying `count` anvils, 2 Bulk each. */
function anvils(count: ItemQuantity): CharacterDocument {
  const inventory = addItem(EMPTY_INVENTORY, {
    id: InventoryItemId.parse('00000000-0000-4000-8000-000000000000'),
    item: itemFixtureId(ItemFixture.Anvil),
    quantity: count,
    container: undefined,
  });
  return { ...new CharacterBuilder().build().document, inventory };
}

describe('encumbrance under the No Encumbrance variant rule', () => {
  const registry = itemFixtureRegistry();
  registry.register(
    new ContentPackBuilder()
      .withId('gm-variants')
      .withVariantRuleElements('no-encumbrance', undefined, [
        { key: RuleElementKey.RollOption, option: NO_ENCUMBRANCE },
      ])
      .build(),
  );
  const plain = slotContent(itemFixtureRegistry());
  const off = slotContent(registry, registry.variantRules());

  test('carrying too much is encumbered without the variant rule', () => {
    expect(equippedRules(anvils(OVER_THE_LIMIT), content, plain).rules).not.toStrictEqual([]);
  });

  test('puts nothing in play with it, however much is carried', () => {
    expect(equippedRules(anvils(OVER_THE_LIMIT), content, off).rules).toStrictEqual([]);
    expect(equippedRules(anvils(OVER_THE_MAXIMUM), content, off).rules).toStrictEqual([]);
  });
});
