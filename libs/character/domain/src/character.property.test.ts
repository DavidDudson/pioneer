import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { fakeSeeded } from '@pioneer/shared/kernel/testing';
import { assert, nat, option, pre, property, record, uuid } from 'fast-check';
import * as z from 'zod';

import { Character } from './character';
import { CharacterPatchField, CharacterPatchSchema, inventoryTarget } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { InventoryItemId, inventoryRefusal } from './inventory';
import type { InventoryEdit, InventoryItem } from './inventory';
import { CharacterBuilder, inventory } from './testing';

installRulesFakes();
const later = fixedClock('2030-01-01T00:00:00Z').now();
const character = nat().map((seed) => CharacterBuilder.random(seed).build());

/** A random character carrying a random inventory, containers nested. */
const stocked = record({ seed: nat(), stock: inventory }).map(({ seed, stock }) => {
  const built = CharacterBuilder.random(seed).build();
  return new Character({
    document: { ...built.document, inventory: stock },
    version: built.version,
    createdAt: built.createdAt,
    updatedAt: built.updatedAt,
  });
});

/** A random edit, the items it names picked by index from the character's own, and the id an added item gets. */
const edit = record({
  seed: nat(),
  index: nat(),
  target: option(nat(), { nil: undefined }),
  newItemId: uuid({ version: 4 }).map((id) => InventoryItemId.parse(id)),
});

/** Which items an edit names, by index into the character's items. */
interface Aim {
  readonly index: number;
  readonly target: number | undefined;
}

/** The id of the item at `index`, wrapping round; undefined for an empty inventory. */
function itemAt(items: readonly InventoryItem[], index: number): InventoryItemId | undefined {
  return items.length === 0 ? undefined : items[index % items.length]?.id;
}

/** A rune edit aimed at item `id`, a transfer onto `to`; as it was without them. */
function aimedRune(
  patch: Extract<CharacterPatch, { readonly rune: unknown }>,
  id: InventoryItemId | undefined,
  to: InventoryItemId | undefined,
): CharacterPatch {
  if (id === undefined) {
    return patch;
  }
  if (patch.field !== CharacterPatchField.TransferRune) {
    return { ...patch, id };
  }
  return to === undefined ? patch : { ...patch, id, to };
}

/**
 * `patch` aimed at the character's own items, so every inventory command is exercised rather than refused for naming
 * an item the character hasn't: the item it changes is the one at `index`, the container the one at `target` or none.
 */
function aimed(patch: CharacterPatch, items: readonly InventoryItem[], { index, target }: Aim): CharacterPatch {
  const id = itemAt(items, index);
  const container = target === undefined ? undefined : itemAt(items, target);
  const stowed = container === undefined ? {} : { container };
  switch (patch.field) {
    case CharacterPatchField.GiftItem: {
      return { field: patch.field, item: patch.item, quantity: patch.quantity, ...stowed };
    }
    case CharacterPatchField.MoveItem: {
      return id === undefined ? patch : { field: patch.field, id, ...stowed };
    }
    case CharacterPatchField.RemoveItem:
    case CharacterPatchField.SetItemQuantity:
    case CharacterPatchField.RenameItem:
    case CharacterPatchField.CarryItem:
    case CharacterPatchField.InvestItem: {
      return id === undefined ? patch : { ...patch, id };
    }
    case CharacterPatchField.EtchRune:
    case CharacterPatchField.EraseRune:
    case CharacterPatchField.TransferRune: {
      return aimedRune(patch, id, container);
    }
    case CharacterPatchField.Name:
    case CharacterPatchField.Level:
    case CharacterPatchField.SelectSlot:
    case CharacterPatchField.ClearSlot:
    case CharacterPatchField.SetCoins: {
      return patch;
    }
    default: {
      const unreachable: never = patch;
      throw new TypeError(`Unhandled character patch: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** What an inventory edit touches, as `inventoryRefusal` reads it. */
function touched(patch: CharacterPatch): InventoryEdit {
  return inventoryTarget(patch) ?? {};
}

describe('Character (properties)', () => {
  test('codec round-trip: decode(encode(c)) re-encodes identically', () => {
    assert(
      property(character, (original) => {
        const wire = z.encode(Character.codec, original);
        const decoded = Character.codec.parse(structuredClone(wire));
        expect(decoded).toBeInstanceOf(Character);
        expect(z.encode(Character.codec, decoded)).toStrictEqual(wire);
      }),
    );
  });

  test('apply keeps identity, version and creation time, and stays valid', () => {
    assert(
      property(stocked, edit, (original, { seed, index, target, newItemId }) => {
        const { items } = original.document.inventory;
        const patch = aimed(fakeSeeded(CharacterPatchSchema, seed), items, { index, target });
        // Only a move of a container into itself or what it holds is left for the service to refuse.
        pre(inventoryRefusal(original.document.inventory, touched(patch)) === undefined);
        const next = original.apply(patch, later, newItemId);
        expect(next.id).toBe(original.id);
        expect(next.version).toBe(original.version);
        expect(next.createdAt.equals(original.createdAt)).toBe(true);
        expect(next.updatedAt.equals(later)).toBe(true);
        expect(Character.codec.safeParse(z.encode(Character.codec, next)).success).toBe(true);
      }),
    );
  });

  test('random(seed) is reproducible', () => {
    assert(
      property(nat(), (seed) => {
        expect(z.encode(Character.codec, CharacterBuilder.random(seed).build())).toStrictEqual(
          z.encode(Character.codec, CharacterBuilder.random(seed).build()),
        );
      }),
    );
  });
});
