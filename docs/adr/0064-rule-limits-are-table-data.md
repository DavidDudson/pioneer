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

## Where limits live and how they combine

- A campaign stores its limits in `campaign_rule_limits`, one row per limit (the GM sets them). A character in a
  campaign reads the campaign's; a character outside a campaign reads its own `character_rule_limits` (its owner sets
  them), else the core rules'. Attaching to a campaign switches the set and detaching brings the character's own back
  untouched, as for packs and variant rules (ADR-0061).
- A campaign can lower a limit and its characters are held to it. A raise past the core number only stops the flags on
  imported lines: in-app edits are clamped back to the core numbers by `storableLimits`, because the schema stores the
  player's lines up to those only.
- Precedence, lowest first: the core rules' number, the number of the variant rules in force, then the explicit number of
  the campaign's GM or, outside a campaign, of the character's owner. A variant rule declares limits as content; a
  table's explicit limit is a setting, not content.

## Variant rules declare limits

- A variant rule's `data` (and its definition) gains `limits`, a closed set with the same four names as `RuleLimits`,
  each optional: a limit it leaves out is not changed. A number is a whole number from 1 up to the same ceiling a GM or
  owner is held to, so a pack cannot store nonsense. An unknown name, or a number past its ceiling, fails the import and
  the pack schema. A test in `apps/api` holds the names and ceilings to `RuleLimits` and `LIMIT_CEILINGS`.
- A variant rule may lower a limit as well as raise it. It applies while the variant is in force: the campaign's
  variants for a character in a campaign, else the owner's own (ADR-0061), and only while a pack in force defines it.
- **Two variants that change the same limit conflict, and the more permissive wins.** Every limit is a most, so the
  higher number wins, whichever variant was turned on first. A variant that lowers a limit only lowers it when no other
  variant in force changes it to a higher number. `mergeVariantLimits` in `libs/rules/sdk` is the one place this is
  decided; the character and campaign contexts both read it through their own adapter.
- A variant's number sits under the explicit setting, so a GM or owner can set a limit lower than the variant lifted it
  to. A reset removes the explicit number and the variant's returns, not the core rules'. Nothing derived is stored: the
  effective limits are worked out on every read, so turning a variant off, or a pack off, takes its numbers away at once.
- Each limit on the table-limits screen and the sheet carries a `source` (`core`, `variant`, `campaign` or `character`)
  saying which layer its number comes from. `custom` still means an explicit setting, which is what a reset removes.
- A variant's raise past the core number behaves as a campaign's does: it stops the flags on imported lines, and
  in-app edits stay clamped to the core numbers by `storableLimits`.

## Consequences

- The schema enforces the core numbers on the player's lines, so a table that raises a limit cannot yet store a
  player's inventory past the core numbers; only imported lines may.
- The sheet reads the table's limits from `GET /characters/:id/rule-limits` and shows violations against them; the core
  rules' apply until they arrive.

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
  item works until a GM says otherwise (see "A GM approves a rule-breaking item").
- The sheet marks each flagged line with a warning tag and one reason per rule broken (the limit and the count it
  reached, or the rune it cannot hold), and the header counts the items that break a rule.

## A GM approves a rule-breaking item

- A campaign's GM approves a flagged item so its warning goes quiet. An approval is a row in `campaign_item_approvals`:
  campaign, character, inventory item, rule, the count approved, who and when. For a rune not allowed it also names the
  rune, and the count is 1; every other rule stores the nil UUID as its rune so the live-row unique index needs no
  nullable column. Revoking sets `archived_at` and never deletes (ADR-0062; `archive.protect` makes the database say so),
  and a revoked approval no longer holds its place, so the item can be approved again.
- **The count is the one the item is flagged at when the GM approves.** The GM never types a number: the server finds the
  current violation for the item and rule and records its count (items invested, hands in use, property runes etched).
  An item that is not flagged for that rule is a 404. The approval covers the item for that rule at no more than that
  count, so an item that shrinks stays approved and one that breaks the rule by more warns again and shows in the GM's
  review list; approving it again replaces the count. A rune not allowed is approved for that rune only, so etching a
  different bad rune warns.
- Nothing derived is stored: whether a line is flagged is still worked out on every read, and an approval only filters
  the result. An approval whose item no longer breaks the rule stays inert and applies again if the item breaks it
  within the count; the GM sees and revokes the ones that cover a flagged item now.
- **GM only.** The GM approves and revokes (a player is refused with a 403, a non-member gets a 404). Every member reads
  the approved items and sees them marked "approved by the GM"; only the GM reads the "Needs review" list of every
  flagged, unapproved item across the party. The review is worked out in the composition root over the party's
  characters, as the campaign context may not import the character context.
- The sheet reads its own approvals from `GET /characters/:id/item-approvals` (the owner only) and filters the same
  violations with `partitionApproved`. An approved reason moves from the warning to an "approved by the GM" tag, and the
  header counts only the items that still warn. The campaign's `approves` and the character's `covers` are the same
  rule written in each context; a test in `apps/api` holds the rule names together.
- **A character outside a campaign has no approvals, so its warnings stay.** Whether the owner may acknowledge them is
  an open question on the epic (#919), not decided here. Leaving a campaign takes the approvals away with it, as they
  belong to the campaign; they come back if the character returns to that campaign.

## A GM gives a character a key item

- A key item is a named, story-significant item a campaign's GM creates (Caliburn: a base item, its runes and notes). It
  is **campaign data**: a row in `campaign_key_items` holding the name, the base content item (id and the name the
  campaign shows), the runes exactly as the GM states them (even past the table's caps; stored as JSON, the grades
  within what a line stores), the notes, the holder (a character, or none while the party stash holds it) and
  `archived_at`. It is audited, and archived, never deleted (ADR-0062; `archive.protect` says so). Archiving keeps the
  holder it had, so the history shows who held it. The holder's foreign key to `characters` is `restrict`, as characters
  are archived, never deleted.
- **The character's inventory line only links to it.** A line carries an optional `keyItem` id (schema version 10; the
  upgrade step is the identity, as for `origin`). The line holds the base item, the runes and the key item's name for
  the holder's play, copied when the GM gives it; the key item stays the campaign's. Giving, moving and taking back are
  GM commands that add, move or remove that line, written through the `KeyItemHolders` port, which the composition root
  implements over the character context (neither context may import the other). The GM is not the character's owner, so
  these writes check the actor runs the campaign and that the character is in its party, not who owns the character.
- **A key item breaks no rule and needs no approval.** The schema's core-number checks apply to the player's lines only,
  and `playerLimits` skips a key item's line as it skips an imported one. `inventoryViolations` drops a key line's own
  violations, so it never warns, never joins "Needs review", and the sheet marks it "Key item". Its hands and
  investment still count towards the totals other lines are held to, as they are real.
- **The player cannot remove or sell a key line, or change its quantity** (a 422 on `RemoveItem` and `SetItemQuantity`);
  the sheet offers neither. They can stow, hold, wear and invest it, and rename it.
- **Everyone in the campaign reads the key items and who holds them**; only the GM creates, gives, moves, takes back and
  archives (a player is refused with a 403, a non-member gets a 404). Moving a key item takes the old holder's line
  first and adds the new one's after, so a move that fails halfway can be tried again. There is no transaction across
  the two contexts. A character that leaves the party while holding a key item keeps the line until the GM takes it back.
- The base item and runes are picked in the campaign page from the rules content by name. The campaign context knows
  content by id and name only, so the page asks a `KEY_ITEM_CONTENT_SEARCH` the app provides over the content search.
