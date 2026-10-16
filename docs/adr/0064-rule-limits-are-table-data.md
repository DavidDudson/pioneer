# 0064. Rule limits are table data

- Status: Proposed
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

- The schema still enforces the core numbers until the stories that store a rule-breaking inventory land, so a table
  that raises a limit cannot yet store an inventory past the core numbers.
- The sheet and the API do not yet show violations; that follows once limits are stored.
