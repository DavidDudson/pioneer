import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { array, assert, integer, property } from 'fast-check';

import { Character } from './character';
import { CharacterPatchField, CharacterPatchSchema } from './character-patch';
import { canHoldCoins, canTakeCoins } from './coin-gifts';
import { CoinChangeSchema, ledgerCoins, LedgerNote, LedgerReason } from './coin-ledger';
import { CoinsSchema, InventorySchema } from './inventory';
import type { Inventory } from './inventory';
import { CharacterBuilder, humanAncestryId } from './testing';

installRulesFakes();

const now = fixedClock('2026-10-07T10:00:00Z').now();

function withPurse(inventory: Inventory): Character {
  const base = new CharacterBuilder().build();

  return Character.create({
    id: base.id,
    ownerId: base.ownerId,
    name: base.name,
    ancestry: humanAncestryId,
    inventory,
    now,
  });
}

const coinsArbitrary = array(integer({ min: 0, max: 5000 }), { minLength: 4, maxLength: 4 }).map(([pp, gp, sp, cp]) =>
  CoinsSchema.parse({ pp, gp, sp, cp }),
);

const loot = LedgerReason.Loot;

describe('gifting and taking coins', () => {
  test('a gift adds every denomination and writes a ledger entry with its reason and note', () => {
    const character = withPurse(InventorySchema.parse({ coins: { gp: 1, cp: 4 } }));
    const note = LedgerNote.parse('Dragon hoard');

    const gifted = character.apply(
      {
        field: CharacterPatchField.GiftCoins,
        coins: CoinsSchema.parse({ pp: 1, gp: 2, sp: 3, cp: 4 }),
        reason: loot,
        note,
      },
      now,
    );

    expect(gifted.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ pp: 1, gp: 3, sp: 3, cp: 8 }));
    expect(gifted.document.inventory.ledger.at(-1)).toMatchObject({
      reason: loot,
      change: CoinChangeSchema.parse({ pp: 1, gp: 2, sp: 3, cp: 4 }),
      note,
    });
  });

  test('a gift with no note writes an entry with none', () => {
    const gifted = withPurse(InventorySchema.parse({})).apply(
      { field: CharacterPatchField.GiftCoins, coins: CoinsSchema.parse({ gp: 5 }), reason: LedgerReason.Gift },
      now,
    );

    expect(gifted.document.inventory.ledger.at(-1)).toStrictEqual({
      reason: LedgerReason.Gift,
      change: CoinChangeSchema.parse({ gp: 5 }),
      at: expect.any(String),
    });
  });

  test('a take removes the coins and writes a negative entry', () => {
    const character = withPurse(InventorySchema.parse({ coins: { pp: 1, gp: 5, sp: 5, cp: 5 } }));

    const taken = character.apply(
      { field: CharacterPatchField.TakeCoins, coins: CoinsSchema.parse({ gp: 2, cp: 5 }), reason: loot },
      now,
    );

    expect(taken.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ pp: 1, gp: 3, sp: 5 }));
    expect(taken.document.inventory.ledger.at(-1)).toMatchObject({
      reason: loot,
      change: CoinChangeSchema.parse({ gp: -2, cp: -5 }),
    });
  });

  test('a take of a coin the purse holds only in a larger one makes change', () => {
    const character = withPurse(InventorySchema.parse({ coins: { gp: 1 } }));

    const taken = character.apply(
      { field: CharacterPatchField.TakeCoins, coins: CoinsSchema.parse({ sp: 3 }), reason: loot },
      now,
    );

    expect(taken.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ sp: 7 }));
  });

  test('a purse worth less cannot be taken from, and nothing changes', () => {
    const character = withPurse(InventorySchema.parse({ coins: { gp: 1 } }));
    const coins = CoinsSchema.parse({ gp: 1, cp: 1 });

    expect(canTakeCoins(character.document, coins)).toBe(false);
    expect(() => character.apply({ field: CharacterPatchField.TakeCoins, coins, reason: loot }, now)).toThrow(
      'Cannot take',
    );
  });

  test('coins worth nothing are no gift or take', () => {
    for (const field of [CharacterPatchField.GiftCoins, CharacterPatchField.TakeCoins]) {
      const parsed = CharacterPatchSchema.safeParse({ field, coins: {}, reason: loot });

      expect(parsed.success).toBe(false);
    }
  });

  test('a reason other than a gift or loot is refused', () => {
    const parsed = CharacterPatchSchema.safeParse({
      field: CharacterPatchField.GiftCoins,
      coins: { gp: 1 },
      reason: LedgerReason.Purchase,
    });

    expect(parsed.success).toBe(false);
  });

  test('coins are always the ledger entries added up, through gifts and takes', () => {
    assert(
      property(coinsArbitrary, array(coinsArbitrary, { maxLength: 12 }), (opening, edits) => {
        let character = withPurse(InventorySchema.parse({ coins: opening }));

        for (const [index, coins] of edits.entries()) {
          const field = index % 2 === 0 ? CharacterPatchField.GiftCoins : CharacterPatchField.TakeCoins;
          const patch = { field, coins, reason: loot } as const;

          const allowed = field === CharacterPatchField.GiftCoins || canTakeCoins(character.document, coins);

          if (allowed && CharacterPatchSchema.safeParse(patch).success) {
            character = character.apply(patch, now);
          }
        }

        const { coins, ledger } = character.document.inventory;

        expect(ledgerCoins(ledger)).toStrictEqual(coins);
      }),
    );
  });

  test('taking exactly what the purse is worth empties it', () => {
    const character = withPurse(InventorySchema.parse({ coins: { gp: 1, sp: 5 } }));
    const coins = CoinsSchema.parse({ gp: 1, sp: 5 });

    expect(canTakeCoins(character.document, coins)).toBe(true);

    const taken = character.apply({ field: CharacterPatchField.TakeCoins, coins, reason: loot }, now);

    expect(taken.document.inventory.coins).toStrictEqual(CoinsSchema.parse({}));
  });

  test('a purse that a gift would overfill cannot hold it', () => {
    const character = withPurse(InventorySchema.parse({ coins: { cp: 2_147_483_000 } }));

    expect(canHoldCoins(character.document, CoinsSchema.parse({ cp: 647 }))).toBe(true);
    expect(canHoldCoins(character.document, CoinsSchema.parse({ cp: 648 }))).toBe(false);
  });

  test.each([
    ['', false],
    ['   ', false],
    ['x', true],
    ['x'.repeat(200), true],
    ['x'.repeat(201), false],
  ])('a note of %p is accepted: %p', (text, accepted) => {
    expect(LedgerNote.safeParse(text).success).toBe(accepted);
  });

  test('a note is trimmed', () => {
    expect(LedgerNote.parse(' x ')).toBe(LedgerNote.parse('x'));
  });
});
