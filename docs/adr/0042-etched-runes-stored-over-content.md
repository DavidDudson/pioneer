# 0042. Etched runes are stored on the inventory item, over the content's

- Status: Proposed
- Date: 2026-10-11

## Context

Runes (#474) need somewhere to live per item. A specific magic item's content already lists the runes it comes with
(`runes` on weapon, armour and shield data, [content-model.md](../architecture/content-model.md)); any other weapon,
armour or shield has none until a character etches some. GM Core lets a specific item's fundamental runes be etched
higher, but not its property runes, and lets runes move between items. The character document has no other place
for per-item choices yet ("per-item overrides to come").

Three shapes were possible: store the runes in force on the item (a copy of the content's, edited), store only what
was etched over the content's, or keep runes as their own inventory lines etched onto a host.

## Decision

- Each `InventoryItem` has an optional `runes`: `potency`, `striking`, `resilient` and `reinforcing` grades and the
  `property` runes etched, as `rune` content ids. Leaving it out means nothing is etched. No schema version bump: the
  field is optional and every stored document already parses.
- The runes in force are the content's with the etched ones over them (`itemRunes`): each fundamental rune at the
  higher of the two grades, and a specific item's printed property runes, or for any other item the etched ones.
  Erasing an etched rune on a specific item leaves it as it comes.
- Edits are `etchRune`, `eraseRune` and `transferRune`, each a patch field and an audited command. The domain refuses
  what the rules don't allow with the item content and the rune content (`runeRefusal`): a rune on the wrong kind of
  item or one whose restriction it doesn't meet (melee or ranged only), a specific item's property runes, a grade no
  higher than a specific item comes with, a property rune past the potency grade, and moving onto an item that already
  has that fundamental rune. The patch schema refuses a grade past 4 (6 for reinforcing).
- Etched runes are build state, not play state: a play sync ([ADR-0022](0022-foundry-module-and-sync-model.md)) leaves
  them alone, and a build sync writes them.
- Armour with runes needs investing for them to work, as the remaster says: it counts as investable
  (`isInvestable`), and its potency, resilient and property runes work only while it is worn and invested. Its own
  bonus to AC needs only wearing.

## Alternatives

- **The runes in force, copied from content on first etch.** Simpler to read, but a content fix to a specific item
  (a corrected property rune) would never reach a character who had etched anything, and the copy would hide which
  runes the character chose.
- **Runes as inventory lines etched onto a host.** Matches Foundry pf2e, which stores an etched rune as equipment
  with an `etched-onto-…` usage, but etching is not carrying: a rune line would need a carry state, Bulk and
  container rules that never apply to it, and moving its host would have to move it too.

## Consequences

- Property runes past the potency grade stay etched and do nothing until a higher potency rune is etched
  (`workingPropertyRunes`), so erasing potency never loses a rune.
- A property rune's rule elements are a grant root with its host's inventory hop, at its host's item level, so they
  are in play exactly while the host's magic works.
- Striking grades reach a held weapon's Strike input; its damage dice wait for Strikes in the engine (#481).
  Reinforcing grades are stored and named; a shield's Hardness and Hit Points wait for the Strikes section (#482).
