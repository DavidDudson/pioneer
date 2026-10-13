# 0058. Enabling a pack in a campaign enables the packs it extends

- Status: Accepted
- Date: 2026-10-14

## Context

A GM chooses which homebrew packs their campaign uses (`campaign_packs`, ADR-0055). A pack may extend others
(ADR-0057), and its entries reference anything in them, so a campaign that uses a pack but not what it extends cannot
resolve it. Members read a `campaign` pack only through a campaign that enables it (ADR-0007), so the packs a pack
extends must be enabled in the campaign too, or the table cannot open what the pack needs.

Enabling must also hold against a pack going private, and the campaign context may not import homebrew.

## Decision

- **Enabling writes a row for the pack and each pack it extends**, in dependency order, skipping ones already enabled.
  The campaign's list shows them all, with the packs that need each (`requiredBy`), so nothing is pulled in unseen.
  The alternative, deriving the closure when the list is read, would leave members unable to read an extended pack
  that no campaign enables by itself.
- **Official packs are always on.** They have no `campaign_packs` row, are listed first, cannot be disabled (409), and
  enabling one is no change.
- **A pack that something enabled extends cannot be disabled** (409 naming the packs), so the list never holds a pack
  without what it needs. Disabling the extender first frees it. A pack no longer needed stays on until the GM turns
  it off.
- **`PackCatalog` is the campaign context's port to the packs**: what the GM may read, a pack's titles, and the
  closure of what it extends. `HomebrewPackCatalog` in `apps/api` implements it over homebrew's `PackAccessPolicy`
  and dependency graph, so the one place that decides readability (ADR-0055) is also the one campaigns ask.
- **Checks run under lock.** `CampaignPackRepository.enable` locks the `content_packs` rows of the packs it adds
  (`FOR UPDATE`, in id order) before running the checks and inserting, the lock `setVisibility` and the dependency
  checks take. A pack cannot go private under an enablement, and the checks are repeated under the lock: a pack that
  is private, unreadable to the GM, or whose closure grew since the plan is a 409.
- Only the GM changes the list (403 for a player, 404 for a non-member). Every member reads it. `enabled_by` records
  who enabled a row; the foreign key sets it null when that user is deleted, so the campaign keeps its packs.

## Consequences

- A dependency added to an already enabled pack is not enabled in campaigns that use the pack until the GM enables it;
  the registry story ([#701](https://github.com/DavidDudson/pioneer/issues/701)) should treat the enabled rows as the
  source and report a gap.
- Disabling a pack whose entries a member's character picked is allowed; those slots read as missing content through
  the existing slot status.
- `enable` reads the whole pack directory and dependency graph per call. Both are small; revisit with real catalog size.
