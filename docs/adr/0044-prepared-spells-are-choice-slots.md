# 0044. Prepared spells are choice slots; spell access is in the build

- Status: Proposed
- Date: 2026-10-12

## Context

A prepared caster picks which spell fills each of an entry's cantrips and slots (#478). The slots come from the
`SpellSlots` elements in play at the character's level (ADR-0041). A slot takes a spell of its entry's tradition: a
cantrip in a cantrip slot, any other spell in a slot of its rank or higher, heightened. Common spells are open to every
caster of the tradition; uncommon and rare ones need access, which the rules leave to the GM and the character's
story, and which nothing in content records.

Alternatives:

- **A preparation list of its own on the document** (`build.prepared: { entry, rank, spell }[]`). It would need its own
  status, refusals and hidden picks, all of which choice slots already have.
- **Preparations in play state**, changed only during daily preparations. Play state doesn't exist yet (#38), and a
  sheet with no prepared spells until a first rest reads as broken.
- **Uncommon spells behind a toggle** that offers every uncommon spell of the tradition. Quick, but it records nothing
  about which spells the character has found.

## Decision

- Each prepared slot is a choice slot keyed `prepared:<entry>:<cantrip|rank>:<n>`, its pick a spell id in
  `build.choices`. `preparedSlots` reads them at the character's level only, so a pick for a slot the character no longer
  has (a lower level, another class) reads hidden, never planned. `selectSlot` refuses a slot not open at the
  character's level and a spell the slot doesn't offer.
- A cantrip is cast at half the character's level, rounded up; a spell in a higher slot is cast at the slot's rank.
  Focus spells never go in a slot.
- The build lists the uncommon, rare and unique spells the character has access to, `build.spellAccess` (schema
  version 4), changed with `grantSpellAccess` and `revokeSpellAccess`. Common spells and spells no slot takes are
  refused, as is a grant past the most a build lists. A pick whose access is taken away stays, invalid with its own
  reason, until access comes back or the pick changes.
- Pools (a divine font, a curriculum) keep showing counts only; preparing into them is #581. Changing preparations
  during daily preparations is #580.

## Consequences

- Prepared spells come with the slot machinery for free: statuses on every read, the Choices section's reasons, the
  audit log by command, hidden picks kept through a level change.
- Preparations are part of the build, so they persist across sessions; daily preparations (#347, #580) change the same
  picks rather than a per-day copy, unless that story decides otherwise.
- Access is the player's record, not a rule: nothing checks why the character has it.
- Every prepared entry is offered its tradition's whole list. That is the rule for a cleric or a druid; a wizard prepares
  from a spellbook and a witch from what the familiar knows (Player Core), which nothing records yet, so both are
  offered more than they could prepare until spellbooks and familiars hold spells.
