import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { array, assert, integer, property } from 'fast-check';
import * as z from 'zod';

import { Character } from './character';
import { decodeCharacterDocument } from './character-document';
import { CharacterSchemaVersion } from './character-document-upgrades';
import { CharacterPatchField } from './character-patch';
import { coinChange, CoinChangeSchema, ledgerCoins, LedgerReason } from './coin-ledger';
import { CoinsSchema, InventorySchema } from './inventory';
import type { Inventory } from './inventory';
import { CharacterBuilder, humanAncestryId } from './testing';
import { PAST_DOCUMENTS } from './testing/past-documents';

/** A stored document, as far as the test edits it. */
const StoredDocument = z.looseObject({ inventory: z.looseObject({}) });

installRulesFakes();

const later = fixedClock('2026-10-07T10:00:00Z').now();

/** A character created holding `inventory`. */
function withPurse(inventory: Inventory): Character {
  const base = new CharacterBuilder().build();

  return Character.create({
    id: base.id,
    ownerId: base.ownerId,
    name: base.name,
    ancestry: humanAncestryId,
    inventory,
    now: later,
  });
}

const coinsArbitrary = array(integer({ min: 0, max: 5000 }), { minLength: 4, maxLength: 4 }).map(([pp, gp, sp, cp]) =>
  CoinsSchema.parse({ pp, gp, sp, cp }),
);

describe('coin ledger', () => {
  test('coinChange is the signed difference, coin by coin', () => {
    const change = coinChange(CoinsSchema.parse({ gp: 5, cp: 2 }), CoinsSchema.parse({ gp: 3, sp: 4 }));

    expect(change).toStrictEqual(CoinChangeSchema.parse({ gp: -2, sp: 4, cp: -2 }));
  });

  test('an edit that moves no coin adds no entry', () => {
    const same = new CharacterBuilder().build();
    const edited = same.apply({ field: CharacterPatchField.SetCoins, coins: same.document.inventory.coins }, later);

    expect(edited.document.inventory.ledger).toStrictEqual([]);
  });

  test('a new character with coins starts with an opening entry for them', () => {
    const coins = CoinsSchema.parse({ gp: 15 });
    const inventory = InventorySchema.parse({ coins });
    const created = withPurse(inventory);

    expect(created.document.inventory.ledger).toStrictEqual([
      { reason: LedgerReason.Opening, change: CoinChangeSchema.parse({ gp: 15 }) },
    ]);
  });

  test('a new character with no coins starts with an empty ledger', () => {
    expect(withPurse(InventorySchema.parse({})).document.inventory.ledger).toStrictEqual([]);
  });

  test('a payment sets the purse and enters the change as a purchase', () => {
    const held = withPurse(InventorySchema.parse({ coins: { gp: 1 } }));

    const paid = held.withInventory(
      { ...held.document.inventory, coins: CoinsSchema.parse({ sp: 6 }) },
      later,
      LedgerReason.Purchase,
    );

    expect(paid.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ sp: 6 }));
    expect(paid.document.inventory.ledger.at(-1)).toMatchObject({
      reason: LedgerReason.Purchase,
      change: CoinChangeSchema.parse({ gp: -1, sp: 6 }),
    });
  });

  test('upgrading a character of the version before the ledger writes an opening entry for its coins', () => {
    const past = PAST_DOCUMENTS.get(CharacterSchemaVersion.parse(22));
    const upgraded = decodeCharacterDocument(past);

    expect(upgraded.inventory.ledger).toStrictEqual([
      { reason: LedgerReason.Opening, change: CoinChangeSchema.parse({ gp: 3, cp: 5 }) },
    ]);
  });

  test('a change made outside an edit, as a transfer is, is a transfer entry', () => {
    const giver = withPurse(InventorySchema.parse({ coins: { gp: 10 } }));
    const coins = CoinsSchema.parse({ gp: 6 });
    const after = giver.withInventory({ ...giver.document.inventory, coins }, later);

    expect(after.document.inventory.ledger.at(-1)).toMatchObject({
      reason: LedgerReason.Transfer,
      change: { pp: 0, gp: -4, sp: 0, cp: 0 },
    });
  });

  test('coins are always what the ledger adds up to', () => {
    assert(
      property(coinsArbitrary, array(coinsArbitrary, { maxLength: 12 }), (opening, edits) => {
        let character = withPurse(InventorySchema.parse({ coins: opening }));

        for (const coins of edits) {
          character = character.apply({ field: CharacterPatchField.SetCoins, coins }, later);
        }

        const { coins, ledger } = character.document.inventory;

        expect(ledgerCoins(ledger)).toStrictEqual(coins);
      }),
    );
  });

  test('upgrading a character with no coins writes no opening entry', () => {
    const past = StoredDocument.parse(PAST_DOCUMENTS.get(CharacterSchemaVersion.parse(22)));
    const upgraded = decodeCharacterDocument({ ...past, inventory: { ...past.inventory, coins: {} } });

    expect(upgraded.inventory.ledger).toStrictEqual([]);
  });
});
