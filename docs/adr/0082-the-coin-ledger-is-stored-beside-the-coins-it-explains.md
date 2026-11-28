# 0082. The coin ledger is stored beside the coins it explains

- Status: Proposed
- Date: 2026-11-26

## Context

Every coin change needs a reason the player can read back: an opening balance, a shop purchase, a hand edit, a transfer.
Later stories add more (gifts, Earn Income, crafting, rituals). The purse is `inventory.coins`, a count per coin.

[ADR-0004](0004-store-inputs-not-derived-values.md) says no derived value is persisted. A ledger invites a purse
derived from its entries, so the two are in tension.

Alternatives:

- **Derive the purse from the ledger.** One source of truth. But the shop's change-making, the coin editor and every
  reader of `inventory.coins` would change, and a long ledger would be summed on every read.
- **Keep `coins`, add no ledger.** Nothing to reconcile, and no history.
- **Store both** (chosen). `coins` stays the stored count, and `inventory.ledger` is an append-only record of how it
  got there.

## Decision

`inventory.ledger` is stored next to `inventory.coins`. The ledger is the input and `coins` is a stored projection of
it: `Character.apply` and `Character.withInventory` diff the coins before and after an edit and append one entry for
any change, so the two cannot drift through the aggregate. A new character, and a character upgraded to schema version
23, start with an opening entry for the coins they hold.

An entry holds a reason and a signed change per coin, so a purchase that breaks a larger coin for change is one entry
with its net change.

## Consequences

- Any coin change made through the aggregate is recorded with no call-site wiring. A change that bypasses it would
  drift from the ledger.
- The ledger grows for the life of the character. A compaction step, folding old entries into one opening-style
  entry, is a later story; the Wealth section shows the newest entries first.
- Later reasons are a new `LedgerReason` value and a mapping in `coin-ledger-edits.ts`, with no schema step.
