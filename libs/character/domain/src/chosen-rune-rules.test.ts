import { describe, expect, test } from 'bun:test';

import { DamageAmount, FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { equippedRules } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, investItem, ItemQuantity } from './inventory';
import { CarryState } from './item-carry';
import { etchRune } from './rune-edits';
import { RuneChoice } from './rune-etching';
import type { RuneEtching } from './rune-etching';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  fundamental,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  itemFixtureRegistry,
  RuneFixture,
  runeFixtureId,
} from './testing';

installRulesFakes();
const content = itemFixtureContent();
const slots = slotContent(itemFixtureRegistry());
const ARMOR = InventoryItemId.parse('00000000-0000-4000-8000-000000000000');

/** An energy-resistant rune etched for `choice`, or for nothing. */
function energyRune(rune: RuneFixture, choice?: string): RuneEtching {
  const etching: RuneEtching = { type: RuneType.Property, rune: runeFixtureId(rune) };
  return choice === undefined ? etching : { ...etching, choice: RuneChoice.parse(choice) };
}

/** The rules in play for worn, invested leather armour at +2 with `etchings` etched onto it. */
function rulesOfArmor(...etchings: readonly RuneEtching[]): readonly object[] {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: ARMOR,
    item: itemFixtureId(ItemFixture.LeatherArmor),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  inventory = carryItem(inventory, ARMOR, { state: CarryState.Worn });
  inventory = etchRune(inventory, ARMOR, fundamental(FundamentalRune.Potency, 2));
  for (const etching of etchings) {
    inventory = etchRune(inventory, ARMOR, etching);
  }
  const document = { ...new CharacterBuilder().build().document, inventory: investItem(inventory, ARMOR, true) };
  return equippedRules(document, content, slots).rules.map(({ element }) => element);
}

describe('energy-resistant runes', () => {
  test('give a resistance to each type their crafters chose, 5 and 10 by grade', () => {
    const rules = rulesOfArmor(
      energyRune(RuneFixture.EnergyResistant, 'acid'),
      energyRune(RuneFixture.EnergyResistantGreater, 'fire'),
    );
    expect(rules).toStrictEqual([
      { key: 'Resistance', type: ['acid'], value: DamageAmount.parse(5) },
      { key: 'Resistance', type: ['fire'], value: DamageAmount.parse(10) },
    ]);
  });

  test('give nothing when etched with no choice', () => {
    expect(rulesOfArmor(energyRune(RuneFixture.EnergyResistant))).toStrictEqual([]);
  });

  test('give nothing for a choice that is no energy they are made for', () => {
    expect(rulesOfArmor(energyRune(RuneFixture.EnergyResistant, 'hope'))).toStrictEqual([]);
    expect(rulesOfArmor(energyRune(RuneFixture.EnergyResistant, 'sonic'))).toStrictEqual([]);
  });
});
