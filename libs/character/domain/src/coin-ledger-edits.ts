import type { Temporal } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { coinChange, LedgerReason, withCoinEntry } from './coin-ledger';
import type { LedgerEntry, LedgerNote } from './coin-ledger';
import { CoinsSchema } from './coins';
import type { Coins } from './coins';
import type { Inventory } from './inventory';

const NO_COINS = CoinsSchema.parse({});

/** The reason a patch moves coins: a purchase pays, earning income credits, a hand edit adjusts. Any other change is a transfer between purses. */
const REASONS: Readonly<Partial<Record<CharacterPatchField, LedgerReason>>> = {
  [CharacterPatchField.BuyItem]: LedgerReason.Purchase,
  [CharacterPatchField.BuyKit]: LedgerReason.Purchase,
  [CharacterPatchField.SetCoins]: LedgerReason.Adjustment,
  [CharacterPatchField.EarnIncome]: LedgerReason.Income,
};

/** The reason `patch` moves coins, for a patch that does. A gift or a take names its own reason. */
export function reasonFor(patch: CharacterPatch): LedgerReason {
  if (patch.field === CharacterPatchField.GiftCoins || patch.field === CharacterPatchField.TakeCoins) {
    return patch.reason;
  }

  return REASONS[patch.field] ?? LedgerReason.Transfer;
}

/** The note the player wrote with `patch`, for a gift or a take that has one. */
export function noteFor(patch: CharacterPatch): LedgerNote | undefined {
  if (patch.field === CharacterPatchField.GiftCoins || patch.field === CharacterPatchField.TakeCoins) {
    return patch.note;
  }

  return undefined;
}

/** One edit's document before and after, why any coins moved and when. */
interface CoinEdit {
  readonly before: CharacterDocument;
  readonly after: CharacterDocument;
  readonly reason: LedgerReason;
  readonly note?: LedgerNote | undefined;
  readonly now: Temporal.Instant;
}

/** `after` with a ledger entry for any coin it moved from `before`; the ledger is the only thing it appends to. */
export function withCoinLedger({ before, after, reason, note, now }: CoinEdit): CharacterDocument {
  const ledger: ReadonlyArray<LedgerEntry> = withCoinEntry(before.inventory.ledger, {
    before: before.inventory.coins,
    after: after.inventory.coins,
    reason,
    note,
    now,
  });

  return { ...after, inventory: { ...after.inventory, ledger } };
}

/** `inventory` with its coins entered as the ledger's opening entry, when it holds any and has no ledger yet. */
export function withOpeningEntry(inventory: Inventory): Inventory {
  const change = coinChange(NO_COINS, inventory.coins);
  const holdsCoins = Object.values(change).some((count) => count > 0);

  if (!holdsCoins || inventory.ledger.length > 0) {
    return inventory;
  }

  return { ...inventory, ledger: [{ reason: LedgerReason.Opening, change }] };
}

/** `document` holding `coins`, with no ledger entry: `withCoinLedger` adds that once the edit is done. */
export function withCoins(document: CharacterDocument, coins: Coins): CharacterDocument {
  return { ...document, inventory: { ...document.inventory, coins } };
}
