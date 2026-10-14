# 0060. A character uses its own packs until a campaign decides

- Status: Accepted
- Date: 2026-10-14

## Context

A campaign's GM chooses its homebrew packs (`campaign_packs`, ADR-0058). A character outside campaigns has no GM, so its
owner chooses (`character_packs`). A character in a campaign uses the campaign's packs and ignores its own
(play-and-campaigns.md), so the same character has one effective set at a time, and attaching or detaching switches it.

The character and campaign contexts may not import each other, and the packs belong to rules and homebrew.

## Decision

- **`character_packs` mirrors `campaign_packs`**: one row per homebrew pack, `(character_id, pack_id)` unique, `pack_id`
  indexed with a foreign key to `content_packs` (cascade) and `enabled_by` set null with the user, both written by hand
  in the migration. Official packs are always on and have no row.
- **The effective set is read, not stored.** `CharacterPackService` asks `AttachedCampaignPacks`, a port the character
  context defines and `apps/api` implements over `campaign_characters` and `campaign_packs`, whether the character is in
  a campaign. If it is, the campaign's packs are the set, the list says which campaign decides, and enabling or
  disabling is a 409. Detaching brings the character's own rows back, untouched: attaching never copies or deletes them.
- **The owner enables any pack they can read, a private one included.** A private pack is the owner's alone, and a
  character is where they try it before sharing it with campaigns. A campaign cannot use a private pack (ADR-0058), so the
  asymmetry is deliberate. A pack extending one the owner cannot read is a 409, as for campaigns.
- **No lock, and a read-time filter.** Unlike a campaign, a character's rows do not hold a pack's visibility: one
  pack may sit in many users' characters, and making it private must not wait on all of them. The pack's owner may
  change its visibility at any time, so the list shows only the packs the owner can read now; a row for a pack that went
  private comes back if it is shared again. The registry story ([#701](https://github.com/DavidDudson/pioneer/issues/701))
  must apply the same filter.
- **`PackCatalog` is not shared.** `CharacterPackCatalog` has the same four methods as the campaign context's port and
  `HomebrewPackCatalog` serves both; the types are structurally equal because ids and titles are the same Zod brands.
- Only the owner reads or changes the list: another user gets a 404 (ADR-0007).

## Consequences

- The server builds a character's registry from the effective set (`StoredContentSource.registry(packs)` through
  `CharacterContent`, which asks `CharacterPackService.of`), so the sheet, play, inventory edits and export see the
  character's homebrew. The browser asks for the same packs' bundles from `/api/content/homebrew`, which apply the
  read-time filter above, so the sheet's registry matches the server's ([#701](https://github.com/DavidDudson/pioneer/issues/701)).
- The owner of a pack cannot see which characters use it, so making it private does not warn about them.
- Two services now enumerate the pack catalogue per request. Both are small; revisit with real catalogue size.
