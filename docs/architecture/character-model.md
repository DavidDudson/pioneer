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
}

interface Inventory {
  items: readonly InventoryItem[]; // content ref, quantity, container, worn/held/invested,
  // runes etched, custom name, per-item overrides
  coins: Coins;
}

interface PlayState {
  hp: { current: number; temp: number };
  conditions: readonly ActiveCondition[]; // content ref, value, duration, source event
  effects: readonly ActiveEffect[]; // spell/feat effects, GM effects
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
- If content changes (errata, a homebrew edit) and a selection becomes invalid, the slot is flagged on the sheet
  with the reason. It is never deleted silently.
- Retraining is changing a selection; the audit log keeps the history.

## Persistence

```text
characters        id, owner_id, name, level, version, schema_version, document jsonb,
                  created_at, updated_at      -- audited, optimistic concurrency on version
```

The document is one aggregate, validated by zod and versioned with the existing `expectedVersion` PATCH pattern.
Edits stay field-level commands (`selectSlot`, `addItem`, `setHp`, `addCondition`), so the API stays small and each
command is auditable. List queries use the scalar columns; the document is never queried into.

Campaign characters keep their build and inventory here; play state lives in `document.play` and syncs
with Foundry per the campaign's mode (see [play-and-campaigns.md](play-and-campaigns.md#campaigns)).

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
