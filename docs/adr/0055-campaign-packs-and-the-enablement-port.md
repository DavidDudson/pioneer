# 0055. Campaigns enable packs through `campaign_packs`; homebrew asks through a port

- Status: Accepted
- Date: 2026-10-13

## Context

A homebrew pack has a visibility: `private`, `campaign` or `public` (ADR-0007). `campaign` means members of
campaigns that enable the pack may read it, and a pack must not go private while a campaign still enables it, or
that campaign's GM loses content without knowing. Both rules need to know which campaigns enable a pack.

Homebrew and campaign are separate contexts, and neither may import the other (ports are adapted in `apps/api`'s
composition root, as for `CharacterDirectory`). The rules context owns `content_packs`, and campaign may only refer
to it.

Alternatives:

- **Homebrew reads campaign's tables.** Breaks the boundary, and each story that touches enablement would grow
  homebrew's knowledge of campaign.
- **Campaign owns the visibility rules.** Campaign would decide who may read a pack it does not own.
- **A port in homebrew, implemented in the composition root** (chosen).

## Decision

- `campaign_packs` (campaign context) holds one row per pack enabled in a campaign. `pack_id` has a foreign key
  to `content_packs`, written by hand in the migration since campaign's tables may not import rules'; deleting a
  pack takes it out of its campaigns. `(campaign_id, pack_id)` is unique and `pack_id` is indexed.
- `EnabledPackId` is the campaign context's name for a pack. It is the same Zod brand (`ContentPackId`) as in
  rules, so an id passes between the contexts at the composition root unchanged and campaign still only refers to
  packs.
- `PackEnablementDirectory` is the port homebrew's application layer defines: `campaignsEnabling(pack)` and
  `belongsToCampaignEnabling(user, pack)`. `CampaignPackEnablementDirectory` in `apps/api` implements it over
  campaign's tables. `InMemoryPackEnablementDirectory` serves tests.
- `PackAccessPolicy` is the one place that decides who may read a pack. A refusal is a 404, so an unreadable
  pack's id reveals nothing; a reader who does not own the pack is refused changes with a 403.
- Making a pack private is refused with a 409 naming the campaigns. The check runs inside the repository's
  transaction (`updateVisibility(pack, whileLocked)`) after the `content_packs` row is locked `FOR UPDATE`.
  Whatever enables a pack must take the same row lock before it inserts into `campaign_packs`, so enabling and
  going private cannot both succeed.

## Consequences

- The enable-pack story writes `campaign_packs`, applies `PackAccessPolicy` (a campaign may enable only a pack its
  GM may read) and takes the row lock.
- The pack-delete story applies the same campaign-naming refusal; the foreign key's cascade is the backstop, not
  the check.
- Homebrew's tests never need a database for access rules; the Postgres test in `apps/api` covers the adapter and
  the service over it.
- The pack has no viewer-relative field, so the visibility control also shows to readers who do not own the pack;
  the server refuses them. Revisit when the contract grows one.
