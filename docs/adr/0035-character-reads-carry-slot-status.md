# 0035. A character read carries its slots' statuses, worked out by the server

- Status: Proposed
- Date: 2026-10-11

## Context

The sheet must show every slot a character has with its status (#419): open, filled, planned above its level,
hidden (a pick kept for a slot it no longer has) or invalid with a reason, so a broken or planned choice never
disappears. Statuses depend on the content as much as on the picks: an errata or a homebrew edit can make a stored
pick invalid, and a pack that isn't installed makes it unreadable.

The character's wire is its inputs only, and attribute modifiers (#418) are worked out by the web from its own
registry. Doing the same for slots would need the browser to load every kind the grants walk reaches (feats,
features, heritages as they land), and "content not loaded" would mean only "this page didn't ask for that kind".

## Decision

- `characterSlots(document, content)` in the character domain works the statuses out, over the grants resolved at
  the character's level and each level above it, and the boost sets. It is pure, so the web builder can call it too.
- `GET /characters/:id` and `PATCH /characters/:id` answer with a `CharacterSheet`: `{ character, slots }`. The
  server reads the slots over its full registry on every read; they are never stored. `Character.codec` stays the
  inputs only, and the list, create and import responses keep it.
- The status, the subject (root slot, boost or `ChoiceSet`) and the names of the entry and pick are data; reasons are
  message keys (`rules.choices.invalid.*`). The sheet turns them into lines for `pio-choices`.

## Consequences

- One source of truth for what a slot is and whether its pick holds, on the server, with all content.
- A read resolves grants once per level from the character's to 20th: twenty at 1st level. Fine for current content;
  if it shows up in profiles, resolve only the levels where the grants change.
- The web's sheet cache holds the sheet, so a create or import no longer seeds it: the sheet fetches once on opening.
- Attribute modifiers stay derived in the browser for now; moving them onto the sheet response is a later choice.
