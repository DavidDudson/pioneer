# Character model

A character is stored as **inputs** to the engine. Nothing derived is persisted. This is the main difference from
Pathbuilder's save format, which stores computed totals (`acTotal`, proficiency numbers) next to choices; we keep
its idea of a compact, choice-oriented build and drop the computed half.

## Document

```ts
interface CharacterDocument {
  schemaVersion: number;
  id: CharacterId;
  ownerId: UserId;
  name: string;
  level: number;
  packs: readonly PackId[]; // enabled content (campaign packs take precedence)
  build: Build;
  inventory: Inventory;
  play: PlayState;
  overrides: readonly Override[];
  notes: RichText;
}

interface Build {
  choices: Record<SlotKey, Selection>; // everything the player picked
  boons: readonly ActiveEffect[]; // permanent boons; temporary ones live in play.effects
}

interface Inventory {
  items: readonly InventoryItem[]; // content ref, quantity, container, worn/held/invested,
  // runes etched, custom name, per-item overrides
  coins: Coins;
}

interface PlayState {
  hp: { current: number; temp: number };
  conditions: readonly ActiveCondition[]; // content ref, value, duration, source event
  effects: readonly ActiveEffect[]; // spell/feat effects, temporary boons: source, lifetime, uses left
  resources: Record<ResourceKey, number>; // focus points, hero points, spell slots used, item uses
  toggles: Record<RollOptionKey, boolean>; // RollOption toggles (e.g. rage, Double Slice second attack)
  wielding: WieldState; // which items are in which hands
  dying: number;
  wounded: number;
  doomed: number;
}
```

### Choice slots

The engine produces the list of open slots from content: `ancestry`, `heritage`, `background`, `class`,
`boost:1:ancestry:0`, `feat:class:2`, `skill-increase:3`, `choice:<entry>:<flag>` for a `ChoiceSet` on any
granted item. Each slot has its origin, its allowed options (a predicate over content, e.g. "level ≤ 2 fighter
feats you meet the prerequisites of"), and its current selection.

The character stores `SlotKey → Selection` only. Consequences:

- Levelling up opens slots; levelling down hides them but keeps the selection, so it comes back.
- The level planner uses the same rule: selections above the current level are the plan, and levelling up turns
  them on. A planned selection that stops being valid is flagged at its level, like any other invalid choice.
- If content changes (errata, a homebrew edit) and a selection becomes invalid, the slot is flagged on the sheet
  with the reason. It is never deleted silently.
- Retraining is changing a selection; the audit log keeps the history.

### Archetype dedications

After a dedication feat, a character can't take another dedication until they have two other feats from that
archetype (Player Core). The count is the `archetype` entry's `dedicationLock` (2 when absent), so a homebrew or
variant archetype can change it. The engine adds this rule to every feat slot's offer: a dedication whose lock is
unmet is offered as unavailable, with the reason and the archetype it waits on, never hidden.

The engine also reports each archetype the character has: its feats taken, the feats still needed, and the
earliest planned level at which another dedication becomes legal. The Plan tab shows this per archetype ("Medic:
1 of 2 feats before your next dedication") and marks the level where the lock clears. A planned dedication above
that level is valid; one below it is flagged at its level like any other invalid plan. Free Archetype adds slots
but doesn't change the lock.

## Shop

Buying and gifts are inventory commands, so they work in every sync mode (inventory is build data):

- **Buy**: adds the item and pays its `price` times the quantity from `coins`, making change across copper,
  silver, gold and platinum. If the character can't afford it, the purchase is refused, never left in debt.
- **Add without paying**: the same picker, no coins move. For loot, a GM's reward or starting gear. The audit log
  records it as a gift, apart from a purchase.

The picker is the item kinds' filters ([content-model.md](content-model.md#filters)) and opens on **Available to
you**: item level at most the character's, unique items and `artifact` items hidden, uncommon and rare shown with
their badge. One toggle shows everything. Settlement level and item availability are left to the GM.

## Persistence

```text
characters        id, owner_id, name, level, version, schema_version, document jsonb,
                  created_at, updated_at      -- audited, optimistic concurrency on version
```

The document is one aggregate, validated by zod and versioned with the existing `expectedVersion` PATCH pattern.
Edits stay field-level commands (`selectSlot`, `addItem`, `setHp`, `addCondition`), so the API stays small and each
command is auditable: its name (`CharacterCommand`) lands in `audit.log.command`, so a gift reads apart from a
purchase. List queries use the scalar columns; the document is never queried into.

Campaign characters keep their build and inventory here. Play state is stored apart, in a `character_play` row
with its own `play_revision`, and read into `document.play`: play-state commands never touch the character's
`version`, and build saves never write play state ([ADR-0023](../adr/0022-foundry-module-and-sync-model.md)). It
syncs with Foundry per the campaign's mode (see [play-and-campaigns.md](play-and-campaigns.md#campaigns)).

## Overrides

```ts
interface Override {
  id: OverrideId;
  target: Selector; // ac, skill:stealth, hp:max, speed:land, ...
  mode: 'adjust' | 'set';
  value: number;
  type?: ModifierType; // adjust only, defaults to untyped
  predicate?: Predicate; // overrides can be conditional too
  note?: string;
  by: UserId;
  at: Instant;
}
```

Overrides are compiled into rule elements with an `override` origin and run through the engine like anything
else (see [rules-engine.md](rules-engine.md#overrides)). The sheet shows a marker on every overridden statistic and
the breakdown lists who set it, when and why. A GM can add overrides to campaign characters; the player sees them.

## Import and export

- **Pathbuilder import:** read Pathbuilder's JSON export, map names to entries via `externalIds.pathbuilder` and
  name matching, fill slots, and report anything unmatched. Their computed totals are used as a check: after
  import, differences between their numbers and ours are listed.
- **Pioneer JSON:** the `CharacterDocument` plus the ids and versions of packs used. Homebrew entries referenced by
  the character are embedded so the file is portable.
- **Foundry export:** see [play-and-campaigns.md](play-and-campaigns.md#foundry-export).
