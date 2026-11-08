import { describe, expect, test } from 'bun:test';

import { inventoryItemOf } from '@pioneer/rules/engine';
import { FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { equippedGrants } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { etchRune } from './rune-edits';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  clumsyFixtureId,
  fundamental,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  itemFixtureRegistry,
  RuneFixture,
  runeFixtureId,
} from './testing';

installRulesFakes();
const WEAPON = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');

/** A character with a longsword etched with the Quickstrike fixture rune, carried as given. */
function wielding(carry: Carry): CharacterDocument {
  const stocked = addItem(EMPTY_INVENTORY, {
    id: WEAPON,
    item: itemFixtureId(ItemFixture.Longsword),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  const potency = etchRune(carryItem(stocked, WEAPON, carry), WEAPON, fundamental(FundamentalRune.Potency, 1));
  const etched = etchRune(potency, WEAPON, { type: RuneType.Property, rune: runeFixtureId(RuneFixture.Quickstrike) });
  return { ...new CharacterBuilder().build().document, inventory: etched };
}

/** The inventory items whose rune-granted entries are the clumsy condition. */
function grantedBy(document: CharacterDocument): readonly (InventoryItemId | undefined)[] {
  const slots = slotContent(itemFixtureRegistry());
  return equippedGrants(document, itemFixtureContent(), slots)
    .items.filter(({ entry }) => entry.id === clumsyFixtureId())
    .map(({ origin }) => inventoryItemOf(origin));
}

describe('a granting rune on a weapon', () => {
  test('grants its condition with an origin that names the wielded weapon', () => {
    expect(grantedBy(wielding({ state: CarryState.Held, hands: ONE_HAND }))).toStrictEqual([WEAPON]);
  });

  test('grants nothing while the weapon is stowed', () => {
    expect(grantedBy(wielding({ state: CarryState.Stowed }))).toStrictEqual([]);
  });
});
