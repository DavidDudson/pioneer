import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { array, assert, integer, property } from 'fast-check';

import { Character } from './character';
import { CharacterPatchField } from './character-patch';
import { CoinChangeSchema, ledgerCoins, LedgerReason } from './coin-ledger';
import { canSimplify, simplifiedCoins } from './coin-simplify';
import { CoinsSchema, InventorySchema } from './inventory';
import type { Inventory } from './inventory';
import { coinsValue } from './purse';
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

describe('simplifying coins', () => {
  test('trades ten of a coin for one of the next, leaving what makes no whole coin', () => {
    expect(simplifiedCoins(CoinsSchema.parse({ cp: 27, sp: 3 }))).toStrictEqual(CoinsSchema.parse({ cp: 7, sp: 5 }));
  });

  test('carries again: copper that makes silver can make gold, and gold platinum', () => {
    expect(simplifiedCoins(CoinsSchema.parse({ cp: 1000 }))).toStrictEqual(CoinsSchema.parse({ pp: 1 }));
    expect(simplifiedCoins(CoinsSchema.parse({ cp: 9, sp: 9, gp: 9 }))).toStrictEqual(
      CoinsSchema.parse({ cp: 9, sp: 9, gp: 9 }),
    );
    expect(simplifiedCoins(CoinsSchema.parse({ cp: 10, sp: 9, gp: 9 }))).toStrictEqual(CoinsSchema.parse({ pp: 1 }));
  });

  test('says whether anything can be traded up', () => {
    expect(canSimplify(CoinsSchema.parse({ cp: 9, sp: 9, gp: 9, pp: 40 }))).toBe(false);
    expect(canSimplify(CoinsSchema.parse({ cp: 10 }))).toBe(true);
    expect(canSimplify(CoinsSchema.parse({}))).toBe(false);
  });

  test('the edit writes a ledger entry whose changes sum to nothing in value', () => {
    const character = withPurse(InventorySchema.parse({ coins: { cp: 25, sp: 12 } }));
    const simplified = character.apply({ field: CharacterPatchField.SimplifyCoins }, now);

    expect(simplified.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ gp: 1, sp: 4, cp: 5 }));
    expect(simplified.document.inventory.ledger.at(-1)).toMatchObject({
      reason: LedgerReason.Simplify,
      change: CoinChangeSchema.parse({ gp: 1, sp: -8, cp: -20 }),
    });
  });

  test('an edit with nothing to trade writes no entry', () => {
    const character = withPurse(InventorySchema.parse({ coins: { cp: 9 } }));
    const same = character.apply({ field: CharacterPatchField.SimplifyCoins }, now);

    expect(same.document.inventory.ledger).toStrictEqual(character.document.inventory.ledger);
  });

  test('value is preserved and no coin below the top holds ten or more', () => {
    assert(
      property(coinsArbitrary, (coins) => {
        const simplified = simplifiedCoins(coins);

        expect(coinsValue(simplified)).toBe(coinsValue(coins));
        expect(simplified.cp).toBeLessThan(10);
        expect(simplified.sp).toBeLessThan(10);
        expect(simplified.gp).toBeLessThan(10);
        expect(canSimplify(simplified)).toBe(false);
      }),
    );
  });

  test('coins are always the ledger entries added up, through simplifying', () => {
    assert(
      property(coinsArbitrary, (opening) => {
        const character = withPurse(InventorySchema.parse({ coins: opening }));
        const simplified = character.apply({ field: CharacterPatchField.SimplifyCoins }, now);
        const { coins, ledger } = simplified.document.inventory;

        expect(ledgerCoins(ledger)).toStrictEqual(coins);
      }),
    );
  });
});
