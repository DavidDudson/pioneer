# 0039. Conditions the character's inputs bring are grant roots, not play state

- Status: Proposed
- Date: 2026-10-11

## Context

Bulk and encumbrance (#473) make a character encumbered while it carries more Bulk than 5 plus its Strength
modifier. Encumbered is a condition, and its effect on statistics belongs in content: the packs'
`condition:encumbered` entry and its rule elements ([ADR-0003](0003-content-as-data-imported-from-foundry.md)).
Until now every active condition was play state, applied and removed by someone and synced by slug per sync mode
([ADR-0022](0022-foundry-module-and-sync-model.md)). Encumbered is different: whether it applies follows from the
inventory and attributes, which are already stored.

Alternatives:

- **Store it in play state** and have the sheet add or remove it when an edit crosses the limit. A derived value
  would be stored ([ADR-0004](0004-store-inputs-not-derived-values.md)), every inventory edit, attribute change and
  Foundry sync would have to keep it in step, and a missed one leaves a character encumbered with nothing to carry.
- **Write its effect into the engine** (clumsy 1, -10 feet). Rules text would live in code, and a pack or variant
  that changes encumbered could not.
- **Expose only a roll option** (`self:encumbered`). Content would have to predicate on it everywhere; the
  condition's own rule elements would never run.

## Decision

- A condition the character's stored inputs bring is worked out on every read and put in play as a grant root with
  a `condition` origin hop, never stored. Encumbered is the first: `equippedRules` adds the loaded packs'
  `condition:encumbered` while `inventoryBulk` says the character is encumbered or over its maximum. With no such
  entry loaded, nothing is put in play, and the sheet still says the character is encumbered.
- Sync leaves derived conditions out. A play snapshot (#220) that carries Foundry pf2e's own encumbered condition
  does not store it, and a stored copy is dropped on read; in `pioneer` mode the module's reconciliation treats
  derived conditions as Pioneer's, so it does not remove the encumbered condition Foundry derives itself.

## Consequences

- Encumbered can never go stale: it holds exactly while the inventory and Strength say so.
- Its breakdown lines name the condition through the `condition` hop, like any other condition's.
- The play snapshot and the module's reconciliation need a list of derived condition slugs; it holds only
  `encumbered` today.
