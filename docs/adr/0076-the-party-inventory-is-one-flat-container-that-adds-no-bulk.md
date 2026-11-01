# 0076. The Party Inventory is one flat container that adds no Bulk

- Status: Proposed
- Date: 2026-11-01

## Context

A party holds things in common: the rope nobody owns, the potions for whoever needs them. Until now a campaign could
only move an item from one character to another, through an offer the recipient accepts. Containers nest on a
character's sheet (stack layer 3), and Bulk is worked out per character, so a thing held by the party has no owner to
carry it.

## Decision

1. **One inventory document per campaign.** The stash is a row in `campaign_party_stashes`, keyed by the campaign's id.
   `document` is an `Inventory`; the campaign context stores it without reading it, and the character context owns
   its shape. `version` is the optimistic lock.
2. **Lines move with `giveLine`.** A deposit or a take is the character context's own line move, with what the line
   holds, so the rules for a line (containers, quantities, runes) are the ones a transfer between characters uses.
   `CharacterPartyStash` does it; the composition root's `DatabasePartyStash` is the campaign context's
   `PartyStashKeeper` over it, as neither context may import the other.
3. **A move is one transaction.** It writes the character at the version it read and the stash at the version it read.
   A conflict on either rolls both back and is a 409 `VersionConflictError`; two deposits into a stash not yet made
   leave one winner.
4. **Lines in the stash add Bulk to no one.** The stash belongs to no character.
5. **Any member can take, with no lock.** The campaign's members trust each other with the party's things; a lock
   would need an owner to hold it. A GM who wants a say uses a transfer.
6. **Key item lines are refused.** A key item is kept by the character it was granted to (a 409 with
   its own message).
7. **Two 409s for a full inventory.** A deposit that fills the stash and a take that fills the character are worded
   apart, so the player knows which side has no room. A line that is gone is a 404.
8. **Audit.** The table is audited like every public table, so its key column is `id` (the audit trigger reads
   `id`), which holds the campaign's id. Rows are kept with their campaign (`archive.protect`).

## Consequences

The stash is one document, so every move reads and writes all of it; the 500-line limit bounds that. Two members
moving at once can see a 409 and retry. Pack content a character does not use shows its item id in the stash, since
names are read through a party character's content.
