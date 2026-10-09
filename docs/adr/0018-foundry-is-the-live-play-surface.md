# 0018. Foundry is the live play surface

- Status: Proposed
- Date: 2026-10-10

## Context

[ADR-0006](0006-campaign-event-log-and-live-sync.md) and [ADR-0017](0017-live-sync-over-server-sent-events.md)
planned live play inside Pioneer: a campaign event log, live sync over Server-Sent Events, a combat log, an
encounter tracker, server dice and GM tools. Our GMs run their sessions in Foundry VTT with the pf2e system, which
already does all of that, with maps and tokens on top. Rebuilding it would cost most of a milestone and still lose
to the tool the table is using.

Pioneer's strengths are building and explaining characters. Its content is imported from Foundry pf2e
([ADR-0003](0003-content-as-data-imported-from-foundry.md)) and its rule elements follow Foundry's semantics
([ADR-0008](0008-rule-element-vocabulary.md)), so a character maps onto a Foundry actor closely.

## Decision

- **Live play runs in Foundry.** Pioneer does not build a campaign event log, live sync, combat log, encounter
  tracker, server dice or GM tools.
- **A campaign groups a party and links it to a Foundry world**: members, invites, attached characters and a
  per-campaign link token.
- **A Pioneer module for Foundry pulls from Pioneer.** It imports the campaign's characters as pf2e actors
  through the Foundry export, re-syncs them when a build changes, and posts play state back. Foundry servers are
  often behind NAT, so Pioneer never calls Foundry.
- **Each side owns its fields.** Pioneer owns the build; Foundry owns play state (HP, temporary HP, dying,
  wounded, conditions, effects, resources) and Pioneer stores what Foundry reports in `document.play`.
- Distribution, version compatibility, change detection (polling or a stream) and condition mapping are left to
  the spike #216, which records its own ADR.

## Consequences

- Supersedes ADR-0006 and ADR-0017. Neither was built; the stream design in ADR-0017 may still inform the
  module's change detection.
- The Foundry export moves from M8 to M6, since the module imports its output.
- Pioneer's dice, roll experience and play state stay for solo play and for showing synced state; nothing in them
  needs to work across a table.
- A new deliverable outside the web app: the Foundry module, versioned against Foundry core and the pf2e system.
- Players without Foundry get no shared play in Pioneer. If that is ever needed, it is a new ADR.
