import { describe, expect, test } from 'bun:test';

import { toggleKeyOf } from '@pioneer/rules/grants';
import { RollOption, RuleIndex } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { equippedRules } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, investItem, ItemQuantity } from './inventory';
import { CarryState } from './item-carry';
import { slotContent } from './slot-offer';
import { CharacterBuilder, ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry } from './testing';

installRulesFakes();
const content = itemFixtureContent();
const CLOAK = InventoryItemId.parse('00000000-0000-4000-8000-000000000000');

/** A character wearing a Hunter's cloak, invested. */
function wearing(): CharacterDocument {
  const stock = addItem(EMPTY_INVENTORY, {
    id: CLOAK,
    item: itemFixtureId(ItemFixture.HuntersCloak),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  const worn = investItem(carryItem(stock, CLOAK, { state: CarryState.Worn }), CLOAK, true);
  return { ...new CharacterBuilder().build().document, inventory: worn };
}

describe('equippedRules toggles', () => {
  const slots = slotContent(itemFixtureRegistry());
  const hunters = wearing();
  const focus = toggleKeyOf(itemFixtureId(ItemFixture.HuntersCloak), RuleIndex.parse(0));
  const option = RollOption.parse('self:effect:hunters-focus');

  test('offers the RollOption toggles of the items in play, off while the character has not set them', () => {
    const { toggles, facts } = equippedRules(hunters, content, slots);
    expect(toggles).toHaveLength(1);
    expect(toggles[0]).toMatchObject({ key: focus, option, on: false });
    expect(facts.has(option)).toBe(false);
  });

  test('reads the toggle state the character left in its play state', () => {
    const toggled = { ...hunters, play: { ...hunters.play, toggles: { [focus]: { on: true } } } };
    const { toggles, facts } = equippedRules(toggled, content, slots);
    expect(toggles[0]).toMatchObject({ key: focus, on: true });
    expect(facts.has(option)).toBe(true);
  });
});
