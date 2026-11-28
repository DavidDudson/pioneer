import { describe, expect, test } from 'bun:test';

import type { ModifierInputs, StatisticInputs } from '@pioneer/rules/engine';
import { inPlay } from '@pioneer/rules/engine/testing';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { Modifier, RuneGrade } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES, installRulesFakes } from '@pioneer/rules/sdk/testing';
import type { RuleJson } from '@pioneer/rules/sdk/testing';

import { characterStatisticInputs } from './character-statistics';
import { equippedInputs } from './equipped-inputs';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { ItemRunesSchema } from './rune-etching';
import type { ItemRunes } from './rune-etching';
import { slotContent } from './slot-offer';
import { CharacterBuilder, ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry } from './testing';

installRulesFakes();

const content = itemFixtureContent();
const ID = InventoryItemId.parse('00000000-0000-4000-8000-000000000000');

const HELD: Carry = { state: CarryState.Held, hands: ONE_HAND };
const WORN: Carry = { state: CarryState.Worn };

/** An inventory of one `item`, carried as given. */
function carrying(item: ItemFixture, carry: Carry): Inventory {
  const stock = addItem(EMPTY_INVENTORY, {
    id: ID,
    item: itemFixtureId(item),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });

  return carryItem(stock, ID, carry);
}

/** The alterations in play, each `[element, entry]`. */
function altering(...placed: ReadonlyArray<readonly [RuleJson, string]>): ModifierInputs {
  return {
    rules: placed.map(([element, entry], rule) => inPlay(element, entry, { rule })),
    facts: new PredicateFacts([], CORE_NAMESPACES),
  };
}

/** An `ItemAlteration` that overrides `property` of the `type` items with `value`. */
function overriding(type: string, property: string, value: number): readonly [RuleJson, string] {
  return [{ key: 'ItemAlteration', items: [`item:type:${type}`], property, mode: 'override', value }, property];
}

/** `inventory` with the runes etched onto its one line, invested so that armour's work. */
function etched(inventory: Inventory, runes: ItemRunes): Inventory {
  return { ...inventory, items: inventory.items.map((line) => ({ ...line, runes, invested: true as const })) };
}

/** The potency of each weapon the statistic inputs read. */
function potencies({ weapons = [] }: StatisticInputs): ReadonlyArray<RuneGrade | undefined> {
  return weapons.map(({ potency }) => potency);
}

describe('equipped items with rune grade alterations', () => {
  const rules = altering(
    overriding('weapon', 'potency', 0),
    overriding('armor', 'potency', 0),
    overriding('armor', 'resilient', 0),
    overriding('weapon', 'striking', 1),
  );

  test('a weapon keeps no potency rune and takes the striking grade an alteration sets', () => {
    const runes = ItemRunesSchema.parse({ potency: 2, striking: 3 });
    const inventory = etched(carrying(ItemFixture.Longsword, HELD), runes);

    const [plain] = equippedInputs(inventory, content).weapons;
    const [altered] = equippedInputs(inventory, content, { rules: () => rules }).weapons;

    expect(plain).toMatchObject({ potency: RuneGrade.parse(2), striking: RuneGrade.parse(3) });
    expect(altered?.potency).toBeUndefined();
    expect(altered?.striking).toBe(RuneGrade.parse(1));
  });

  test('armour keeps its own bonus but no potency or resilient rune', () => {
    const runes = ItemRunesSchema.parse({ potency: 2, resilient: 2 });
    const inventory = etched(carrying(ItemFixture.LeatherArmor, WORN), runes);

    const { armor: plain } = equippedInputs(inventory, content);
    const { armor: altered } = equippedInputs(inventory, content, { rules: () => rules });

    expect(plain).toMatchObject({ bonus: Modifier.parse(3), resilient: RuneGrade.parse(2) });
    expect(altered).toMatchObject({ bonus: Modifier.parse(1), resilient: undefined });
  });
});

describe('a variant rule that alters rune grades', () => {
  const pack = new ContentPackBuilder()
    .withId('variants')
    .withVariantRuleElements('no-runes', [], [overriding('weapon', 'potency', 0)[0]])
    .build();

  const registry = itemFixtureRegistry();
  registry.register(pack);
  const variants = registry.variantRules();

  test('reaches the weapons of the statistic inputs while it is in force, and not otherwise', () => {
    const runes = ItemRunesSchema.parse({ potency: 2 });
    const inventory = etched(carrying(ItemFixture.Longsword, HELD), runes);
    const { document } = new CharacterBuilder().build();
    const character = { ...document, inventory };
    const slots = slotContent(registry, variants);

    const off = potencies(characterStatisticInputs(registry, character, { slots }));
    const on = potencies(characterStatisticInputs(registry, character, { slots, variants }));

    expect(off).toStrictEqual([RuneGrade.parse(2)]);
    expect(on).toStrictEqual([undefined]);
  });
});
