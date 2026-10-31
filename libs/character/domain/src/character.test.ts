import { describe, expect, test } from 'bun:test';

import {
  AncestryId,
  BlockKind,
  ChoiceValue,
  contentId,
  CopperValue,
  EntrySlug,
  InlineKind,
  PackId,
  RichTextString,
  SlotKey,
} from '@pioneer/rules/sdk';
import type { RichText } from '@pioneer/rules/sdk';
import { derivedId, fixedClock, FixtureNamespace } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Character } from './character';
import { CharacterId, CharacterLevel, CharacterName } from './character-fields';
import { CharacterPatchField, CharacterPatchSchema } from './character-patch';
import { ANCESTRY_SLOT } from './character-slots';
import { CoinsSchema, InventoryItemId, ItemQuantity } from './inventory';
import { STOWED } from './item-carry';
import { CharacterBuilder, humanAncestryId, ItemFixture, itemFixtureId, KitFixture, kitFixtureId } from './testing';

const later = fixedClock('2026-10-07T10:00:00Z').now();
const featSlot = SlotKey.parse('feat:class:2');
const WRITTEN: RichText = [
  { type: BlockKind.Paragraph, content: [{ type: InlineKind.Text, text: RichTextString.parse('Scarred.') }] },
];

describe('Character', () => {
  test('builder ids are UUIDv5 of the name, so fixtures are stable', () => {
    const valeros = new CharacterBuilder().named('Valeros').build();
    expect(valeros.id).toBe(CharacterId.parse(derivedId(FixtureNamespace, 'character:Valeros')));
    expect(new CharacterBuilder().named('Valeros').build().id).toBe(valeros.id);
  });

  test('codec round-trips to wire JSON and back to a class', () => {
    const wire = z.encode(Character.codec, new CharacterBuilder().build());
    expect(wire.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(wire).not.toHaveProperty('attributes');
    const decoded = Character.codec.parse(structuredClone(wire));
    expect(decoded).toBeInstanceOf(Character);
    expect(decoded.name).toBe(CharacterName.parse('Valeros'));
  });

  test('apply returns a new instance and leaves the original alone', () => {
    const original = new CharacterBuilder().build();
    const renamed = original.apply({ field: CharacterPatchField.Name, value: CharacterName.parse('Seelah') }, later);
    expect(renamed.name).toBe(CharacterName.parse('Seelah'));
    expect(renamed.updatedAt.equals(later)).toBe(true);
    expect(original.name).toBe(CharacterName.parse('Valeros'));
  });

  test.each([
    [CharacterPatchField.SetAppearance, 'appearance', 'personality'],
    [CharacterPatchField.SetPersonality, 'personality', 'appearance'],
  ] as const)('%s writes only its own prose field, and empty rich text clears it', (field, key, other) => {
    const original = new CharacterBuilder().build();
    const edited = original.apply({ field, value: WRITTEN }, later);
    expect(edited.document[key]).toStrictEqual(WRITTEN);
    expect(edited.document[other]).toStrictEqual([]);
    expect(original.document[key]).toStrictEqual([]);
    expect(edited.apply({ field, value: [] }, later).document[key]).toStrictEqual([]);
  });

  test('stores its ancestry and boosts as slot selections, and nothing derived', () => {
    const valeros = new CharacterBuilder().picking('boost:1:free:0', 'str').build();
    expect(Object.entries(valeros.document.build.choices)).toStrictEqual([
      ['ancestry', ChoiceValue.parse(humanAncestryId)],
      ['boost:1:free:0', ChoiceValue.parse('str')],
    ]);
    expect(valeros.document).not.toHaveProperty('attributes');
    expect(valeros.ancestry).toBe(humanAncestryId);
  });

  test('selecting a slot replaces its selection and keeps every other pick', () => {
    const planned = ChoiceValue.parse('sudden-charge');
    const original = new CharacterBuilder().build();
    const withPlan = new Character({
      document: {
        ...original.document,
        build: { ...original.document.build, choices: { ...original.document.build.choices, [featSlot]: planned } },
      },
      version: original.version,
      createdAt: original.createdAt,
      updatedAt: original.updatedAt,
    });
    const elf = AncestryId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf')));
    const changed = withPlan.apply(
      { field: CharacterPatchField.SelectSlot, slot: ANCESTRY_SLOT, selection: ChoiceValue.parse(elf) },
      later,
    );
    expect(changed.ancestry).toBe(elf);
    expect(changed.document.build.choices[featSlot]).toBe(planned);
    expect(z.encode(Character.codec, changed).build?.choices).toStrictEqual({ ancestry: elf, [featSlot]: planned });
  });

  test('clearing a slot drops its selection and keeps every other pick, hidden ones included', () => {
    const planned = ChoiceValue.parse('sudden-charge');
    const original = new CharacterBuilder().build();
    const selected = original.apply(
      { field: CharacterPatchField.SelectSlot, slot: featSlot, selection: planned },
      later,
    );
    const cleared = selected.apply({ field: CharacterPatchField.ClearSlot, slot: ANCESTRY_SLOT }, later);
    expect(cleared.ancestry).toBeUndefined();
    expect(cleared.document.build.choices).toStrictEqual({ [featSlot]: planned });
  });

  test('levelling down keeps a selection for a slot only a higher level has', () => {
    const planned = ChoiceValue.parse('sudden-charge');
    const original = new CharacterBuilder().build();
    const selected = original.apply(
      { field: CharacterPatchField.SelectSlot, slot: featSlot, selection: planned },
      later,
    );
    const levelled = selected.apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(1) }, later);
    expect(levelled.document.build.choices[featSlot]).toBe(planned);
  });

  test('an empty ancestry slot reads as no ancestry', () => {
    const original = new CharacterBuilder().build();
    const unpicked = new Character({
      document: {
        ...original.document,
        build: {
          choices: {},
          spellAccess: [],
          unplacedFeats: [],
          unplacedLanguages: [],
          rituals: [],
          lores: {},
          repertoireSwaps: [],
          boons: [],
        },
      },
      version: original.version,
      createdAt: original.createdAt,
      updatedAt: original.updatedAt,
    });
    expect(unpicked.ancestry).toBeUndefined();
  });

  test('rejects out-of-range level', () => {
    expect(CharacterPatchSchema.safeParse({ field: CharacterPatchField.Level, value: 21 }).success).toBe(false);
  });
});

describe('Character inventory edits', () => {
  const backpackId = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
  const ropeId = InventoryItemId.parse('33333333-3333-4333-8333-333333333333');
  const one = ItemQuantity.parse(1);

  function withBackpack(): Character {
    const added = { field: CharacterPatchField.GiftItem, item: itemFixtureId(ItemFixture.Backpack), quantity: one };
    return new CharacterBuilder().build().apply(added, later, { newItemId: backpackId });
  }

  test('adds an item with the id it is given', () => {
    expect(withBackpack().document.inventory.items).toStrictEqual([
      { id: backpackId, item: itemFixtureId(ItemFixture.Backpack), quantity: one, carry: STOWED },
    ]);
  });

  test('stows a new item in a container, then takes it out', () => {
    const rope = itemFixtureId(ItemFixture.Rope);
    const stowed = withBackpack().apply(
      { field: CharacterPatchField.GiftItem, item: rope, quantity: one, container: backpackId },
      later,
      { newItemId: ropeId },
    );
    expect(stowed.document.inventory.items[1]?.container).toBe(backpackId);
    const loose = stowed.apply({ field: CharacterPatchField.MoveItem, id: ropeId }, later);
    expect(loose.document.inventory.items[1]).not.toHaveProperty('container');
  });

  test('sets coins and keeps the items', () => {
    const coins = CoinsSchema.parse({ gp: 15, sp: 3 });
    const paid = withBackpack().apply({ field: CharacterPatchField.SetCoins, coins }, later);
    expect(paid.document.inventory).toStrictEqual({
      items: withBackpack().document.inventory.items,
      customItems: [],
      coins,
    });
  });

  test('buys an item: adds it and pays its cost from the coins, with change, in one edit', () => {
    const rope = itemFixtureId(ItemFixture.Rope);
    const flush = withBackpack().apply(
      { field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ gp: 1 }) },
      later,
    );
    const bought = flush.apply({ field: CharacterPatchField.BuyItem, item: rope, quantity: one }, later, {
      newItemId: ropeId,
      cost: CopperValue.parse(5),
    });
    expect(bought.document.inventory.items[1]).toStrictEqual({ id: ropeId, item: rope, quantity: one, carry: STOWED });
    expect(bought.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ sp: 9, cp: 5 }));
  });

  test('throws on a purchase with no cost, or one the coins do not cover, which the service refuses first', () => {
    const bought = { field: CharacterPatchField.BuyItem, item: itemFixtureId(ItemFixture.Rope), quantity: one };
    const broke = new CharacterBuilder().build();
    expect(() => broke.apply(bought, later, { newItemId: ropeId })).toThrow('needs the cost');
    expect(() => broke.apply(bought, later, { newItemId: ropeId, cost: CopperValue.parse(1) })).toThrow(
      'needs the cost',
    );
  });

  test('adds a kit: every line the caller expanded it into, and pays for it in one edit when bought', () => {
    const kit = kitFixtureId(KitFixture.Explorer);
    const lines = [
      { id: backpackId, item: itemFixtureId(ItemFixture.Backpack), quantity: one, container: undefined },
      { id: ropeId, item: itemFixtureId(ItemFixture.Rope), quantity: one, container: backpackId },
    ];
    const gifted = new CharacterBuilder().build().apply({ field: CharacterPatchField.GiftKit, kit }, later, {
      kitItems: lines,
    });
    expect(gifted.document.inventory.items).toStrictEqual([
      { id: backpackId, item: itemFixtureId(ItemFixture.Backpack), quantity: one, carry: STOWED },
      { id: ropeId, item: itemFixtureId(ItemFixture.Rope), quantity: one, container: backpackId, carry: STOWED },
    ]);
    const flush = new CharacterBuilder()
      .build()
      .apply({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ gp: 3 }) }, later);
    const bought = flush.apply({ field: CharacterPatchField.BuyKit, kit }, later, {
      kitItems: lines,
      cost: CopperValue.parse(200),
    });
    expect(bought.document.inventory.items).toStrictEqual(gifted.document.inventory.items);
    expect(bought.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ gp: 1 }));
  });

  test('throws on a kit with no lines, or a bought one with no cost, which the service works out first', () => {
    const kit = kitFixtureId(KitFixture.Explorer);
    const broke = new CharacterBuilder().build();
    expect(() => broke.apply({ field: CharacterPatchField.GiftKit, kit }, later)).toThrow('needs the lines');
    expect(() => broke.apply({ field: CharacterPatchField.BuyKit, kit }, later, { kitItems: [] })).toThrow(
      'needs the cost',
    );
  });

  test('throws on an added item with no id: the caller mints it, as it gives the time', () => {
    const added = { field: CharacterPatchField.GiftItem, item: itemFixtureId(ItemFixture.Rope), quantity: one };
    expect(() => new CharacterBuilder().build().apply(added, later)).toThrow('needs the id');
  });

  test('throws on an edit to an item it has not, which the service refuses first', () => {
    expect(() => withBackpack().apply({ field: CharacterPatchField.RemoveItem, id: ropeId }, later)).toThrow(
      'character.validation.itemNotFound',
    );
  });
});
