# 0050. Display preferences scoped to a character live beside it, per user

- Status: Accepted
- Date: 2026-10-12
- Amends: [0013](0013-account-only-display-preferences.md)

## Context

ADR-0013 keeps display preferences per account, one audited `user_preferences` row per user. The sheet's tabs
(play-and-campaigns.md, Sheet modes) need a preference per character: the tab the user last had open on it (#495).
The feat display filter, per user and per sheet section, is the next of its kind.

Alternatives considered:

- **A field on the character document.** Every tab switch would be a character edit: it bumps the version, so an
  inline edit open on another device gets a 409, and it fills the audit log with edits that change nothing about
  the character. A character also stores inputs only (ADR-0004); a viewer's tab is not one.
- **A keyed field in `user_preferences`** (a JSON map from character to tab). One row per user grows with every
  character, outlives deleted characters unless pruned by hand, and needs a read-modify-write per switch.
- **Browser storage.** ADR-0013 rules it out: the browser only caches the account, and a choice should follow the
  person, not the device.

## Decision

- **A display preference scoped to a character is a row per (user, character)** in the character context, in its
  own table (`character_sheet_modes` for the tab), audited like every public table.
- Its foreign keys cascade from both the character and the user, so deleting either forgets the preference.
- It is never part of the character document: reading or changing it never touches the character's version.
- Access follows the character: only a user who may read the character reads or sets their preference on it, and
  anyone else gets the same 404.
- Signed-out visitors have none, as in ADR-0013.

## Consequences

- Switching tabs is one upsert on a small table, with no conflicts with character edits.
- A later preference per character, such as the feat filter, adds a column or a sibling table here, not a field on
  the character or a map in `user_preferences`.
- When campaigns let a GM view a player's character, the GM gets their own row; the key already allows it.
