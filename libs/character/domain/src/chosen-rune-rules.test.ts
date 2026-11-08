import { describe, expect, test } from 'bun:test';

import { DamageAmount, FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { equippedRules } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, investItem, ItemQuantity } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
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

const SWORD = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');

/** The rules in play for a longsword held in one hand at +1 with `etchings` etched onto it. */
function rulesOfSword(...etchings: readonly RuneEtching[]): readonly object[] {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: SWORD,
    item: itemFixtureId(ItemFixture.Longsword),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  inventory = carryItem(inventory, SWORD, { state: CarryState.Held, hands: ONE_HAND });
  inventory = etchRune(inventory, SWORD, fundamental(FundamentalRune.Potency, 1));
  for (const etching of etchings) {
    inventory = etchRune(inventory, SWORD, etching);
  }
  const document = { ...new CharacterBuilder().build().document, inventory };
  return equippedRules(document, content, slots).rules.map(({ element }) => element);
}

describe('bane runes', () => {
  test('add 1d6 damage against creatures of the type their crafter chose', () => {
    expect(rulesOfSword(energyRune(RuneFixture.Bane, 'dragon'))).toStrictEqual([
      {
        key: 'DamageDice',
        selectors: ['etched-damage'],
        diceNumber: 1,
        dieSize: 'd6',
        predicate: [{ or: ['target:trait:dragon'] }],
      },
    ]);
  });

  test('reach both traits for the fungus and plant choice', () => {
    expect(rulesOfSword(energyRune(RuneFixture.Bane, 'fungus-plant'))).toMatchObject([
      { predicate: [{ or: ['target:trait:fungus', 'target:trait:plant'] }] },
    ]);
  });

  test('give nothing with no choice, or for a humanoid or undead', () => {
    expect(rulesOfSword(energyRune(RuneFixture.Bane))).toStrictEqual([]);
    expect(rulesOfSword(energyRune(RuneFixture.Bane, 'undead'))).toStrictEqual([]);
    expect(rulesOfSword(energyRune(RuneFixture.Bane, 'humanoid'))).toStrictEqual([]);
  });
});

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

describe('energy vulnerability runes', () => {
  test('give a critical hit a weakness to the energy their crafter chose, 5 and 10 by grade', () => {
    expect(rulesOfSword(energyRune(RuneFixture.EnergyVulnerability, 'fire'))).toStrictEqual([
      { key: 'CriticalWeakness', selectors: ['etched-damage'], type: 'fire', value: DamageAmount.parse(5) },
    ]);
    expect(rulesOfSword(energyRune(RuneFixture.EnergyVulnerabilityGreater, 'sonic'))).toStrictEqual([
      { key: 'CriticalWeakness', selectors: ['etched-damage'], type: 'sonic', value: DamageAmount.parse(10) },
    ]);
  });

  test('give nothing when etched with no choice', () => {
    expect(rulesOfSword(energyRune(RuneFixture.EnergyVulnerability))).toStrictEqual([]);
  });

  test('give nothing for a choice that is no energy they are made for', () => {
    expect(rulesOfSword(energyRune(RuneFixture.EnergyVulnerability, 'hope'))).toStrictEqual([]);
    expect(rulesOfSword(energyRune(RuneFixture.EnergyVulnerabilityGreater, 'force'))).toStrictEqual([]);
  });
});
