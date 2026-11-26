import type { Temporal } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { coinChange, LedgerReason, withCoinEntry } from './coin-ledger';
import type { LedgerEntry } from './coin-ledger';
import { CoinsSchema } from './coins';
import type { Inventory } from './inventory';

const NO_COINS = CoinsSchema.parse({});

/** The reason a patch moves coins: a purchase pays, a hand edit adjusts. Any other change is a transfer between purses. */
const REASONS: Readonly<Partial<Record<CharacterPatchField, LedgerReason>>> = {
  [CharacterPatchField.BuyItem]: LedgerReason.Purchase,
  [CharacterPatchField.BuyKit]: LedgerReason.Purchase,
  [CharacterPatchField.SetCoins]: LedgerReason.Adjustment,
};

/** One edit's document before and after, the patch that made it (none for a transfer) and when. */
interface CoinEdit {
  readonly before: CharacterDocument;
  readonly after: CharacterDocument;
  readonly patch: CharacterPatch | undefined;
  readonly now: Temporal.Instant;
}

/** `after` with a ledger entry for any coin it moved from `before`; the ledger is the only thing it appends to. */
export function withCoinLedger({ before, after, patch, now }: CoinEdit): CharacterDocument {
  const reason = patch === undefined ? LedgerReason.Transfer : (REASONS[patch.field] ?? LedgerReason.Transfer);

  const ledger: readonly LedgerEntry[] = withCoinEntry(before.inventory.ledger, {
    before: before.inventory.coins,
    after: after.inventory.coins,
    reason,
    now,
  });

  return { ...after, inventory: { ...after.inventory, ledger } };
}

/** `inventory` with its coins entered as the ledger's opening entry, when it holds any and has no ledger yet. */
export function withOpeningEntry(inventory: Inventory): Inventory {
  const delta = coinChange(NO_COINS, inventory.coins);
  const holdsCoins = Object.values(delta).some((count) => count > 0);

  if (!holdsCoins || inventory.ledger.length > 0) {
    return inventory;
  }

  return { ...inventory, ledger: [{ reason: LedgerReason.Opening, change: delta }] };
}
