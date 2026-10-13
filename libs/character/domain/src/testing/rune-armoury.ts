import { RuneType } from '@pioneer/rules/sdk';
import type { FundamentalRune } from '@pioneer/rules/sdk';

import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from '../inventory';
import type { Inventory, InventoryItem } from '../inventory';
import { RuneEtchingSchema } from '../rune-etching';
import type { RuneEtching, RuneRef } from '../rune-etching';
import { ItemFixture, itemFixtureId, runeFixtureId } from './item-content';
import type { RuneFixture } from './rune-fixtures';

/** The items `armoury()` holds, by id. */
export const Armoury = {
  Sword: InventoryItemId.parse('11111111-1111-4111-8111-111111111111'),
  Armor: InventoryItemId.parse('22222222-2222-4222-8222-222222222222'),
  Shield: InventoryItemId.parse('33333333-3333-4333-8333-333333333333'),
  Bow: InventoryItemId.parse('44444444-4444-4444-8444-444444444444'),
  /** A specific magic weapon: +1 striking flaming. */
  Tongue: InventoryItemId.parse('55555555-5555-4555-8555-555555555555'),
  Rope: InventoryItemId.parse('66666666-6666-4666-8666-666666666666'),
  /** A second longsword, to move runes onto. */
  SpareSword: InventoryItemId.parse('77777777-7777-4777-8777-777777777777'),
} as const;

const STOCK: readonly (readonly [InventoryItemId, ItemFixture])[] = [
  [Armoury.Sword, ItemFixture.Longsword],
  [Armoury.Armor, ItemFixture.LeatherArmor],
  [Armoury.Shield, ItemFixture.SteelShield],
  [Armoury.Bow, ItemFixture.Shortbow],
  [Armoury.Tongue, ItemFixture.FlameTongue],
  [Armoury.Rope, ItemFixture.Rope],
  [Armoury.SpareSword, ItemFixture.Longsword],
];

const ONE = ItemQuantity.parse(1);

/** Two longswords, leather armour, a steel shield, a shortbow, a flame tongue and a rope, stowed, no runes etched. */
export function armoury(): Inventory {
  let inventory = EMPTY_INVENTORY;
  for (const [id, fixture] of STOCK) {
    inventory = addItem(inventory, { id, item: itemFixtureId(fixture), quantity: ONE, container: undefined });
  }
  return inventory;
}

/** Fundamental rune `rune` at `grade`, to etch. */
export function fundamental(rune: FundamentalRune, grade: number): RuneEtching {
  return RuneEtchingSchema.parse({ type: RuneType.Fundamental, rune, grade });
}

/** Fundamental rune `rune`, to erase or move. */
export function fundamentalRef(rune: FundamentalRune): RuneRef {
  return { type: RuneType.Fundamental, rune };
}

/** The fixture property rune `rune`, to etch, erase or move. */
export function propertyRune(rune: RuneFixture): RuneEtching & RuneRef {
  return { type: RuneType.Property, rune: runeFixtureId(rune) };
}

/** The line `id` of `inventory`; throws when it has none. */
export function lineOf(inventory: Inventory, id: InventoryItemId): InventoryItem {
  const line = inventory.items.find((each) => each.id === id);
  if (line === undefined) {
    throw new Error(`No item ${id}`);
  }
  return line;
}
