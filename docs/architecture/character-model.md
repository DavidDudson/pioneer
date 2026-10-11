# Character model

A character is stored as **inputs** to the engine. Nothing derived is persisted. This is the main difference from
Pathbuilder's save format, which stores computed totals (`acTotal`, proficiency numbers) next to choices; we keep
its idea of a compact, choice-oriented build and drop the computed half.

## Document

```ts
interface CharacterDocument {
  schemaVersion: CharacterSchemaVersion; // see "Schema versions"
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

The schema is `CharacterDocumentSchema` in `libs/character/domain`. It is strict: a field it doesn't name, such as a
stored total, is rejected. `inventory` holds items and coins ([Inventory](#inventory)). `play`, `boons` and
`overrides` start empty and gain their fields with the epics that own them
([#38](https://github.com/DavidDudson/pioneer/issues/38), [#39](https://github.com/DavidDudson/pioneer/issues/39),
[#34](https://github.com/DavidDudson/pioneer/issues/34)). A selection is a `ChoiceValue`: a content id or a slug.

### Schema versions

Every stored document carries `schemaVersion`. `decodeCharacterDocument` upgrades an older document to the current
version before validating it, and refuses one newer than the code (`UnsupportedSchemaVersionError`, as after a
rollback) rather than read it as the current shape and drop fields on the next save. A stored document that is
invalid at its own version throws `CorruptCharacterDocumentError`: the fault is the server's data, so the API
answers 500, never a 422 that blames the request.

- **Every change to the shape adds a version**, a new defaulted field included, so older code always refuses a
  newer document by its version rather than failing on a field it doesn't know. The change adds one pure step to
  `UPGRADES` in `character-document-upgrades.ts`; a step for a defaulted field returns the document as it is. Step
  _n_ turns version _n_ + 1 into _n_ + 2; the current version is one past the last step, so the two can't drift.
- **Every past version keeps a stored example** in `PAST_DOCUMENTS` (`libs/character/domain/src/testing`), in the
  shape it was written. A test checks that one exists for each past version and that each decodes to the current
  version, so a step can't land without one.
- A step never derives values: when a stored shape changes, it moves the player's inputs, it doesn't compute.

### Choice slots

The engine produces the list of open slots from content: `ancestry`, `heritage`, `background`, `class`,
`boost:1:ancestry:0`, `flaw:1:ancestry:0` (a voluntary flaw, optional), `feat:class:2`, `skill-increase:3`,
`choice:<entry>:<flag>` for a `ChoiceSet` on any granted item. Each slot has its origin, its allowed options (a
predicate over content, e.g. "level ≤ 2 fighter feats you meet the prerequisites of"), and its current selection.

The character stores `SlotKey → Selection` only. Consequences:

- Levelling up opens slots; levelling down returns them to the plan but keeps the selection, so it comes back.
- The level planner uses the same rule: selections above the current level are the plan, and levelling up turns
  them on. A planned selection that stops being valid is flagged at its level, like any other invalid choice.
- If content changes (errata, a homebrew edit) and a selection becomes invalid, the slot is flagged on the sheet
  with the reason. It is never deleted silently.
- Retraining is changing a selection; the audit log keeps the history.

The player picks with `selectSlot { slot, selection }` and empties a slot with `clearSlot { slot }`, each a PATCH
audited by name. `selectSlot` resolves the character's grants over its other picks at every level from 20 down,
with `ancestry`, `heritage`, `background` and `class` as root slots (`CHARACTER_ROOT_SLOTS`), and refuses with a
reason when the slot is open at no level up to 20 (`character.validation.slotNotOpen`) or offers the selection at none
(`character.validation.selectionNotOffered`). Only a new selection is checked: one already stored stays, however
the level or content changes.

The heritage slot is `within` the ancestry slot: it offers the heritages whose `ancestry` is the picked one, and the
versatile heritages, which have none. An edit that leaves a heritage its new ancestry doesn't offer (picking another
ancestry, or clearing it) clears that heritage in the same write, audited as the edit's own command, and the PATCH
answer names it under `cleared`, once: the sheet shows it until dismissed or the next edit. This is the one
exception to keeping picks: the heritage belongs to the ancestry the player just replaced, so keeping it would only
flag a choice they already undid. A heritage that stops fitting without an edit (an errata, content not loaded) stays
and reads invalid, like any other pick.

The sheet's Build section summarises the character: class, subclass, ancestry, heritage, background, deity, key
attribute and size, each empty part saying what to pick, with Edit build taking focus to the pickers.

The class slot's pick grants its class features by level and opens the slots its features ask for. The subclass slot
is the `ChoiceSet` among them that queries class features tagged with the class's `subclass` (a cleric's doctrine, a
wizard's arcane school); a class without one (fighter) has none. The key attribute is the class's boost slot
(`boost:1:class:0`), there only when the class allows more than one. Identity picks the class, then the subclass and
key attribute when the class asks for them. The Class features section lists each feature the class grants at the
character's level with where it came from, "from Cleric, level 1", the level being that of the class's grant (a
subclass feature reads the level of the feature that offered it). Changing the class keeps every pick that depended on
the old one: the subclass and a key attribute it no longer offers read hidden, and come back with the class.

The engine reads the class's Hit Points and key attribute, and the ranks the effective set's `Proficiency` elements
raise (`ranksInPlay`, the highest raise winning): the class's starting ranks, a background's skills, a feature's
later raise. Armor Class takes the unarmored defence rank until armour is worn.

Each slot's status is worked out on every read, never stored (`characterSlots`,
[ADR-0035](../adr/0035-character-reads-carry-slot-status.md)). `GET` and `PATCH /characters/:id` answer with the
character and its slots:

- **open**: on the character at its level, nothing picked.
- **filled**: on the character, with a pick it offers.
- **planned**: opens only above the character's level, read at the lowest level it opens; its pick, if any, is the
  plan.
- **invalid**, with a reason: a pick the slot doesn't offer (errata, a homebrew edit, a lost prerequisite, another
  boost of its set raising the attribute first) or content no loaded pack has. A planned pick that stops being valid
  is invalid at its level.
- **hidden**: a pick kept for a slot the character has neither at its level nor above. Every stored pick is in the
  list, so nothing is dropped silently.

The sheet's Choices section lists them, but the empty planned slots, with a badge per status and the reason under an
invalid one.

### Attribute boosts

Attribute modifiers are never stored: `attributeModifiers` works them out from the boosts on every read, so changing
ancestry, background or class changes them. Each boost with a choice is a slot keyed `boost:<level>:<source>:<n>`,
`n` its place in the content's list, and its selection is the attribute it raises:

- **Ancestry** (`boost:1:ancestry:<n>`): `Ancestry.boosts`, with its `flaws` lowering their attributes by one.
- **Background** (`boost:1:background:<n>`): `Background.boosts`.
- **Class** (`boost:1:class:0`): the key attribute, `CharacterClass.keyAttribute`.
- **Free** (`boost:<level>:free:0` to `3`): four at 1st, 5th, 10th, 15th and 20th level.

A boost that allows one attribute (a dwarf's Constitution, a wizard's Intelligence) is fixed: nothing to choose, so
no slot and nothing stored. A slot offers what its boost allows less what its set's fixed boosts raise, and the boosts
of one set go to different attributes, so `selectSlot` refuses an attribute another boost of the set already raises
(`character.validation.boostTaken`). Each attribute starts at +0; a boost raises it by one, or, at +4 or more, is
partial, and the second partial boost raises it by one (Player Core). Boosts above the character's level are the
plan and don't count yet, and a stored pick its slot no longer offers (left from another ancestry, or after an errata)
counts for nothing until it is changed. `setAttribute` is gone: a boost or flaw pick is the only way to change a
modifier.

**Voluntary flaws** ([#550](https://github.com/DavidDudson/pioneer/issues/550)) are picks too (`flawSlots`): one slot
per attribute the ancestry doesn't flaw already, keyed `flaw:1:ancestry:<n>`, its selection the attribute it lowers
by one, as an ancestry flaw does. Each lowers a different attribute, so `selectSlot` refuses the ancestry's own flaw
(`selectionNotOffered`) and one another voluntary flaw lowers (`character.validation.flawTaken`). A flaw is optional,
so an empty flaw slot is never open: `characterSlots` lists only the flaws taken (subject `flaw`), filled or invalid,
and the sheet's Choices section shows them as "Voluntary flaw". They bring no extra boost; the variant that trades two
flaws for a free boost belongs with the variant rules ([#51](https://github.com/DavidDudson/pioneer/issues/51)).

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

## Inventory

`inventory.items` lists what the character carries (schema version 2, #471). Each item is an `InventoryItemId`, the
content it is (`ContentId` of an armour, consumable, equipment, shield, treasure or weapon entry), a quantity, the
item it is stowed in, if any, and the player's name for it, if any. `inventory.coins` holds platinum, gold, silver
and copper, each 0 or more.

- **Containers.** An item can go in another item whose content is equipment with a `container` (a backpack), and
  containers nest. The document refuses an item in one it hasn't and containers that hold each other.
- **Commands.** `addItem { item, quantity, container? }` (the server gives the item its id), `removeItem { id }`,
  `setItemQuantity`, `moveItem { id, container? }` (no container takes it out), `renameItem { id, name? }` (no name
  goes back to the content's) and `setCoins { coins }`. Each is a PATCH audited by name. The server refuses an item
  the character hasn't (`character.validation.itemNotFound`), a container that isn't there
  (`containerNotFound`), one inside itself or something it holds (`containerInsideItself`), content no loaded pack
  has as an item (`unknownItem`) and stowing in an item that holds nothing (`notAContainer`).
- **Removing a container** moves what it held out to where the container was, so nothing inside is lost.
- **Grouping.** The sheet lists loose items worn, held or stowed and each container's contents beneath it. Until
  wield, wear and invest arrive ([#472](https://github.com/DavidDudson/pioneer/issues/472)), where an item sits comes
  from its content: armour is worn, a shield held, otherwise its `usage` (worn or held), and everything else is
  stowed. Anything inside a container is stowed. Bulk totals and encumbrance are
  [#473](https://github.com/DavidDudson/pioneer/issues/473).

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

`name`, `level` and `owner_id` are copies of the document's, written with it in one statement, so lists sort and
filter on indexed columns. `schema_version` mirrors the document's `schemaVersion`. A read decodes the document with
`decodeCharacterDocument`, upgrading an older one; the next save writes it back at the current version, so old rows
are upgraded as they are touched, never by a bulk rewrite. The ancestry, background and class are their root slots'
selections. Characters stored before boost slots (migration 0014) lost their stored modifiers, which are derived and
can't be turned back into boosts: their boost slots start empty; a Pathbuilder re-import fills them
([#420](https://github.com/DavidDudson/pioneer/issues/420)).

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
  reason: string; // required: why the statistic differs from what the rules give
  by: UserId;
  at: Instant;
}
```

Overrides are compiled into rule elements with an `override` origin and run through the engine like anything
else (see [rules-engine.md](rules-engine.md#overrides)). The sheet shows a marker on every overridden statistic and
the breakdown lists who set it, when and why. Overrides are the only way to change a derived statistic: the
sheet never edits one in place, and an override without a reason is rejected. A GM can add overrides to campaign
characters; the player sees them.

## Import and export

- **Pathbuilder import:** read Pathbuilder's JSON export, map names to entries via `externalIds.pathbuilder` and
  name matching, fill slots, and report anything unmatched. Their computed totals are used as a check: after
  import, differences between their numbers and ours are listed. Pathbuilder exports carry names, not ids, so
  `externalIds.pathbuilder` holds Pathbuilder's name for an entry where it differs from ours; otherwise names match
  ignoring case, accents, apostrophes and punctuation. A name whose kind has no loaded content is reported as "not
  loaded" rather than "not found", so the report stays honest while content kinds are still being indexed. Stories:
  [#52](https://github.com/DavidDudson/pioneer/issues/52); `libs/interop/pathbuilder` holds a real export
  (`fixtures/briar-rose.json`) as the reference sheet. Creating a character posts the raw export to
  `POST /characters/import/pathbuilder`, which reads it again rather than trusting the preview, refuses an ancestry
  that matches no loaded content, and inserts one write audited as `importPathbuilder`: name, level, ancestry, the
  background and first class when they match loaded content, the heritage when it matches one the imported ancestry
  offers (its own or a versatile one; [#555](https://github.com/DavidDudson/pioneer/issues/555)), every boost in its
  slot ([#420](https://github.com/DavidDudson/pioneer/issues/420)) and the voluntary flaws
  ([#550](https://github.com/DavidDudson/pioneer/issues/550)). A loaded heritage of another ancestry is not
  written: the report lists it as "not offered". Each set Pathbuilder recorded (`ancestryBoosts` and
  `ancestryFree` together, `backgroundBoosts`, `classBoosts`, `mapLevelledBoosts`) goes to the set of the same source
  and level; gradual boosts join the next free set (2nd to 5th go to 5th, and so on). Each attribute in
  `ancestryFlaws` the ancestry doesn't flaw already takes a flaw slot, once, in export order. No modifier is stored:
  Pathbuilder's scores are only a check. The import report (unmatched names by kind, the filled fields the character
  can't hold yet, the boosts no slot took, and each attribute whose derived modifier differs from Pathbuilder's) is
  returned, not stored: the sheet shows it until dismissed or reloaded. A dual class
  ([#549](https://github.com/DavidDudson/pioneer/issues/549)) isn't carried yet.
- **Pioneer JSON:** the `CharacterDocument` plus the ids and versions of packs used. Homebrew entries referenced by
  the character are embedded so the file is portable.
- **Foundry export:** see [play-and-campaigns.md](play-and-campaigns.md#foundry-export).
