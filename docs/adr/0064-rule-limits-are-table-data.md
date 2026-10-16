# 0064. Rule limits are table data

- Status: Accepted
- Date: 2026-10-16

## Context

An inventory is held to four numbers: items invested (10), hands to hold things in (2), property runes per grade of
potency rune (1) and lines in the inventory (500). They were constants in the schema, so every table got the core
rules' numbers and an inventory that broke one could not be stored. Epic 6.6 lets imports and key items break them,
lets a GM change them for a campaign, and lets a character outside a campaign set its own.

## Decision

- `RuleLimits { investedMax, handsMax, propertyRunesPerGrade, itemsMax }` is an input to every check that reads one.
  `CORE_RULE_LIMITS` holds the core rules' numbers and is the default, so nothing changes until a table sets its own.
  `inventoryRefusal`, `kitRefusal`, `runeRefusal`, `propertyRoom` and `workingPropertyRunes` read it; `INVESTED_MAX`,
  `HANDS_MAX` and `INVENTORY_ITEMS_MAX` stay as the core numbers the schema's storage ceiling uses.
- `inventoryViolations(inventory, content, limits)` derives, on every read, the rules an inventory breaks. Nothing
  derived is stored. One entry per item and rule:
  - `invested` and `hands`: each item that takes the count past the limit, in inventory order, with the count it
    reached.
  - `propertyRunes`: an item with more property runes than its potency rune leaves room for. A specific item's runes
    come with it and break nothing.
  - `runeNotAllowed`: a property rune the item's kind or etching restriction refuses, read against its other runes.
    The lines limit is a count of the whole inventory, not of one item, so it is refused and never a violation.
- In-app edits still refuse a change that breaks a limit. Only imports and key items may hold a broken inventory; they
  come in the next stories, which also relax the schema's own checks.

## Where limits live and how they combine (decided here, built in later stories)

- A campaign stores its limits (the GM sets them); a character outside a campaign stores its own. A character in a
  campaign reads the campaign's.
- Precedence: a GM's explicit number beats a variant rule's number, which beats the core rules'. A variant rule
  declares limits as content (a later story); a table's explicit limit is a setting, not content.

## Consequences

- The schema enforces the core numbers on the player's lines, so a table that raises a limit cannot yet store a
  player's inventory past the core numbers; only imported lines may.
- The sheet shows violations against the core limits. It reads the table's own limits once they are stored.

## Rule-breaking lines (decided in "flag rule-breaking items instead of refusing them")

- An inventory line carries an optional `origin`. A line with no `origin` is the player's; `import` marks a line an
  import brought in as it was. Document schema version 9 adds the field; the upgrade step changes nothing, so every
  stored line stays the player's.
- The schema's core-number checks (no more held than two hands hold, no more invested than the limit, no more property
  runes than a potency rune and orichalcum allow) apply to the player's lines only. An imported line is stored as
  imported, up to a storage ceiling of 20 property runes per line. The lines limit still binds every line.
- Whether a line breaks a rule is never stored. `inventoryViolations` works it out on every read, so an edit that brings
  a line within the limits clears its warning, and `origin` stays `import`: it records where the line came from, not
  whether it is in good standing.
- In-app edits still refuse a change that adds a violation: investing or holding past the limit, and etching past the
  room. Taking investment off, or putting a hand down, is always allowed.
- A flagged line keeps working: its Bulk, active state and rune effects count as for any other line, so an over-cap
  item works until a GM says otherwise (approvals come in a later story).
- The sheet marks each flagged line with a warning tag and one reason per rule broken (the limit and the count it
  reached, or the rune it cannot hold), and the header counts the items that break a rule.
