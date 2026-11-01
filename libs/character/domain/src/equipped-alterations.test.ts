import { describe, expect, test } from 'bun:test';

import type { ModifierInputs } from '@pioneer/rules/engine';
import { inPlay } from '@pioneer/rules/engine/testing';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { AttributeModifier, Hardness, HitPoints, Slug, Trait } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, installRulesFakes } from '@pioneer/rules/sdk/testing';

import { equippedInputs } from './equipped';
import { heldShields } from './held-shields';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

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
function altering(...placed: readonly (readonly [object, string])[]): ModifierInputs {
  return {
    rules: placed.map(([element, entry], rule) => inPlay(element, entry, { rule })),
    facts: new PredicateFacts([], CORE_NAMESPACES),
  };
}

/** What an alteration does: to which `property`, how, and to what. */
interface Change {
  readonly property: string;
  readonly mode: string;
  readonly value: number | string;
}

const alteration = (items: readonly string[], { property, mode, value }: Change): object => ({
  key: 'ItemAlteration',
  items,
  property,
  mode,
  value,
});

describe('equipped items with ItemAlteration elements', () => {
  test('a shield alteration changes the Hardness, Hit Points and Broken Threshold a held shield shows', () => {
    const rules = altering(
      [alteration(['item:slug:steel-shield'], { property: 'hardness', mode: 'add', value: 2 }), 'reinforced'],
      [alteration(['item:type:shield'], { property: 'hp-max', mode: 'multiply', value: 2 }), 'sturdy'],
    );

    const [shield] = heldShields(carrying(ItemFixture.SteelShield, HELD), content, () => rules);

    expect(shield).toMatchObject({
      hardness: Hardness.parse(7),
      hitPoints: HitPoints.parse(40),
      brokenThreshold: HitPoints.parse(20),
    });
  });

  test('an alteration that does not reach the shield leaves it as its content has it', () => {
    const rules = altering([alteration(['item:type:armor'], { property: 'hardness', mode: 'add', value: 2 }), 'x']);

    const [shield] = heldShields(carrying(ItemFixture.SteelShield, HELD), content, () => rules);

    expect(shield).toMatchObject({ hardness: Hardness.parse(5), hitPoints: HitPoints.parse(20) });
  });

  test('armour alterations change its bonus, Dexterity cap, check penalty and Strength', () => {
    const rules = altering(
      [alteration(['item:type:armor'], { property: 'ac-bonus', mode: 'add', value: 1 }), 'a'],
      [alteration(['item:type:armor'], { property: 'dex-cap', mode: 'subtract', value: 1 }), 'b'],
      [alteration(['item:type:armor'], { property: 'check-penalty', mode: 'override', value: 0 }), 'c'],
      [alteration(['item:type:armor'], { property: 'strength', mode: 'upgrade', value: 2 }), 'd'],
    );

    const inputs = equippedInputs(carrying(ItemFixture.LeatherArmor, WORN), content, { rules: () => rules });

    expect(inputs.armor).toMatchObject({ bonus: 2, checkPenalty: undefined, strength: 2 });
    expect(inputs.dexterityCap).toBe(AttributeModifier.parse(3));
  });

  test('a weapon alteration changes its range increment, traits and damage type', () => {
    const rules = altering(
      [alteration(['item:type:weapon'], { property: 'range-increment', mode: 'upgrade', value: 60 }), 'a'],
      [alteration(['item:type:weapon'], { property: 'traits', mode: 'add', value: 'agile' }), 'b'],
      [alteration(['item:type:weapon'], { property: 'damage-type', mode: 'override', value: 'fire' }), 'c'],
      [alteration(['item:type:weapon'], { property: 'materials', mode: 'add', value: 'cold-iron' }), 'd'],
    );

    const [weapon] = equippedInputs(carrying(ItemFixture.Longsword, HELD), content, { rules: () => rules }).weapons;

    expect(weapon).toMatchObject({
      range: 60,
      damage: { damageType: 'fire' },
      materials: [Slug.parse('cold-iron')],
    });
    expect(weapon?.traits).toContain(Trait.parse('agile'));
  });

  test('without alterations the content stands', () => {
    const [weapon] = equippedInputs(carrying(ItemFixture.Longsword, HELD), content).weapons;

    expect(weapon?.range).toBeUndefined();
    expect(weapon?.damage?.damageType).toBe('slashing');
  });
});

/** An `AdjustStrike` of `property`, reaching the Strikes whose roll options satisfy `strikes`. */
function adjusting(strikes: readonly string[], { property, mode, value }: Change): object {
  return { key: 'AdjustStrike', strikes, property, mode, value };
}

describe('equipped weapons with AdjustStrike elements', () => {
  test.each([
    ['item:category:martial', true],
    ['item:group:sword', true],
    ['item:base:longsword', true],
    ['item:melee', true],
    ['item:ranged', false],
    ['item:thrown', false],
    ['item:magical', false],
    ['item:group:bow', false],
  ])('a longsword Strike is reached by strikes %s: %s', (strikes, reached) => {
    const rules = altering([adjusting([strikes], { property: 'traits', mode: 'add', value: 'holy' }), 'blessing']);

    const [weapon] = equippedInputs(carrying(ItemFixture.Longsword, HELD), content, { rules: () => rules }).weapons;

    expect(weapon?.traits.includes(Trait.parse('holy'))).toBe(reached);
  });

  test('an adjustment changes the Strike with a material, a property rune and a range increment', () => {
    const rules = altering(
      [adjusting(['item:ranged'], { property: 'materials', mode: 'add', value: 'silver' }), 'a'],
      [adjusting(['item:ranged'], { property: 'property-runes', mode: 'add', value: 'ghost-touch' }), 'b'],
      [adjusting(['item:ranged'], { property: 'range-increment', mode: 'multiply', value: 2 }), 'c'],
    );

    const [weapon] = equippedInputs(carrying(ItemFixture.Shortbow, HELD), content, { rules: () => rules }).weapons;

    expect(weapon).toMatchObject({
      materials: [Slug.parse('silver')],
      propertyRunes: [Slug.parse('ghost-touch')],
      range: 120,
    });
  });

  test('an adjustment that does not reach the weapon leaves it as its content has it', () => {
    const rules = altering([adjusting(['item:ranged'], { property: 'materials', mode: 'add', value: 'silver' }), 'a']);

    const [weapon] = equippedInputs(carrying(ItemFixture.Longsword, HELD), content, { rules: () => rules }).weapons;

    expect(weapon?.materials).toEqual([]);
  });
});
