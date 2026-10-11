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
  spellAccess: readonly ContentId[]; // uncommon, rare and unique spells it may prepare (ADR-0044)
  boons: readonly ActiveEffect[]; // permanent boons; temporary ones live in play.effects
}

interface Inventory {
  items: readonly InventoryItem[]; // content ref, quantity, container, custom name, carry
  // (worn, held in 1 or 2 hands, stowed, dropped), invested, runes etched; per-item overrides to come
  coins: Coins;
}

interface PlayState {
  hp: { current: number; temp: number };
  conditions: readonly ActiveCondition[]; // content ref, value, duration, source event
  effects: readonly ActiveEffect[]; // spell/feat effects, temporary boons: source, lifetime, uses left
  resources: Record<ResourceKey, number>; // focus points, hero points, spell slots used, item uses
  toggles: Record<RollOptionKey, boolean>; // RollOption toggles (e.g. rage, Double Slice second attack)
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
`boost:1:ancestry:0`, `flaw:1:ancestry:0` (a voluntary flaw, optional), `feat:class:2`, `skill-training:1:0`,
`skill-increase:3`, `language:1:0`, `choice:<entry>:<flag>` for a `ChoiceSet` on any granted item. Each slot has its
origin, its allowed options (a predicate over content, e.g. "level ≤ 2 fighter feats you meet the prerequisites of"),
and its current selection.

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

A caster's spellcasting entries come from the effective set too (`characterSpellcasting`,
[ADR-0040](../adr/0040-spellcasting-entries-are-rule-elements.md)): each `SpellcastingEntry` element in play is one
entry, from a class's spellcasting feature, a witch's patron (which names the tradition) or a multiclass dedication.
Nothing about them is stored, so changing class or patron changes them. A character has one spellcasting rank,
`spellcasting`, which every entry reads whatever its tradition: a caster class starts trained, and so does anyone
with an entry. The engine derives each entry's spell attack and spell DC from it and the entry's attribute. The
sheet's Spellcasting section, between Choices and Class features, lists each entry's tradition, how it casts (prepared,
spontaneous or innate) and where it came from, "from Wizard Spellcasting", with its spell attack and DC, each
expanding to its breakdown. The rank rises for a wizard, bard, druid or witch with the Expert, Master and Legendary
Spellcaster features at 7th, 15th and 19th level; for a cleric with its doctrine, a cloistered cleric's at 7th, 15th
and 19th and a warpriest's at 11th and 19th; for a multiclass caster with the archetype's Expert and Master
Spellcasting feats, unless the class already raised it.

Each entry has its cantrips and spell slots per rank at the character's level from the `SpellSlots` elements in play
([ADR-0041](../adr/0041-spell-slots-are-rule-elements.md)): the class's table on its spellcasting feature, a multiclass
dedication's two cantrips and the archetype's spellcasting feats' slots. Pools kept apart, a cleric's divine font
and a wizard's curriculum, are listed under the entry by what gave them ("Divine Font slots").

A prepared entry's cantrips and own slots are choice slots, `prepared:<entry>:<cantrip|rank>:<n>`, each picking a spell
([ADR-0044](../adr/0044-prepared-spells-are-choice-slots.md)). They open at the character's level only: a pick kept for
a slot it no longer has reads hidden. A slot offers its entry's tradition's spells that fit it, cantrips in a cantrip
slot (cast at half the level, rounded up) and any other spell in a slot of its rank or higher, never a focus spell.
Common spells are always offered; uncommon, rare and unique ones once `build.spellAccess` lists them, changed with
`grantSpellAccess` and `revokeSpellAccess`. A pick whose access is taken away reads invalid with its reason
(`rules.choices.invalid.spellNoAccess`). The sheet lists each prepared entry's slots rank by rank under its
Spellcasting entry, a picker each, then the spells the build has access to, with Remove and a picker to add one of
its entries' traditions. Pools are prepared in #581.

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

### Skills

Skill ranks are never stored either: the class's and background's `Proficiency` elements raise theirs, and the
player's picks raise the rest ([#464](https://github.com/DavidDudson/pioneer/issues/464)). A pick is a skill's or a
Lore's `statistic` entry (selector `skill:athletics`, `skill:lore:scribing`), so a Lore is a named entry like any
skill. Once a class is picked:

- **Trained skills** (`skill-training:<level>:<n>`): at 1st level, the class's `additionalSkills` plus the
  Intelligence modifier, and one more for each skill the grants train twice (a cleric with the Acolyte background is
  trained in Religion once and picks another skill instead, as Player Core says). Each boost that raises Intelligence
  past what it was adds one at its level. A slot offers the skills not trained yet, by the grants at its level or an
  earlier slot; `selectSlot` refuses one already trained (`character.validation.skillTrained`).
- **Skill increases** (`skill-increase:<level>`): at the class's `skillIncreaseLevels` (Player Core's 3rd and every
  second level after; a rogue's every level from 2nd). Each raises one skill a rank, untrained to trained included:
  expert at any level, master from 7th, legendary from 15th. `selectSlot` refuses a raise past that
  (`character.validation.skillRankCapped`).

The slots are read in order, by level and trained skills first, each over the grants at its level and the picks before
it. A pick its slot no longer offers (the class now trains that skill, an earlier slot took it) reads invalid and counts
for nothing; a pick past the slots the character has (Intelligence lowered) reads hidden. Slots above the character's
level are the plan, and their ranks wait for the level. `buildRanks` gives the engine the higher of the granted and
picked rank for each skill.

The sheet's Skills section lists every skill and Lore with its total, and a picker for each trained skill and skill
increase up to the character's level.

### Languages

Languages are never stored either: the ancestry's `languages` and the `Language` elements of what the character has
grant theirs, and the player picks the rest ([#470](https://github.com/DavidDudson/pioneer/issues/470),
[ADR-0043](../adr/0043-languages-are-a-rule-element-and-domain-slots.md)). A pick is a `language` entry. Once an
ancestry is picked:

- **The ancestry's and Intelligence's** (`language:<level>:<n>`): at 1st level, the ancestry's
  `additionalLanguages.count` plus the Intelligence modifier if positive, and one more for each point a boost raises a
  positive Intelligence modifier past the highest it was, at its level. Each offers the common languages and the
  ancestry's `additionalLanguages.options`.
- **A feature's** (`language:<entry>:<rule>:<n>`): a `Language` element's `slots`, from the lowest level its entry is
  on the character and its predicate holds. The predicate reads the character's skill ranks at that level as Foundry
  writes them (`skill:society:rank:3`), so Multilingual's slot at master in Society opens when a skill increase gets
  there. Each offers the ancestry's list and the languages no rarer than the element's `access` (common when absent;
  Multilingual's uncommon).

The slots are read in order by level, each over the languages known at its level and the picks before it, then over
what features grant at the character's level and every other slot's pick. A slot offers the languages not known yet;
`selectSlot` refuses one known already (`character.validation.languageKnown`) and one rarer than it offers
(`character.validation.selectionNotOffered`). A pick its slot no longer offers reads invalid and counts for nothing,
as does one a feature taken since now grants; its slot is open again. A pick past the slots the character has
(Intelligence lowered, a feat removed) reads hidden.

The sheet's answer carries the languages as the server reads them (`CharacterSheet.languages`): each one known at the
character's level with the ancestry or feature it came from, or the slot of a pick; how many slots up to that level are
open (empty, or holding a pick that counts for nothing); and the next of them with what it offers. The sheet's
Languages section lists them, removes a pick, and has Add language while slots are open, which fills the next one;
each saves in place, and focus stays in the section.

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
item it is stowed in, if any, the player's name for it, if any, how it is carried and whether it is invested (schema
version 3, #472). `inventory.coins` holds platinum, gold, silver and copper, each 0 or more.

- **Containers.** An item can go in another item whose content is equipment with a `container` (a backpack), and
  containers nest. The document refuses an item in one it hasn't and containers that hold each other.
- **Commands.** `giftItem { item, quantity, container? }` (adds without paying; the server gives the item its id),
  `removeItem { id }`, `setItemQuantity`, `moveItem { id, container? }` (no container takes it out),
  `renameItem { id, name? }` (no name goes back to the content's) and `setCoins { coins }`. Each is a PATCH audited
  by name. The server refuses an item the character hasn't (`character.validation.itemNotFound`), a container that
  isn't there
  (`containerNotFound`), one inside itself or something it holds (`containerInsideItself`), content no loaded pack
  has as an item (`unknownItem`) and stowing in an item that holds nothing (`notAContainer`).
- **Removing a container** moves what it held out to where the container was, so nothing inside is lost.
- **Carrying.** `carry` is `worn`, `held` with `hands` (1 or 2), `stowed` (the default, and a new item's) or
  `dropped`. It lives on the item, as Foundry pf2e's `system.equipped` does, but stays a play-state field whose
  owner depends on the sync mode ([ADR-0037](../adr/0037-item-carry-stored-on-inventory-items.md)).
  `carryItem { id, carry }` sets it: worn, held or dropped, an item comes out of its container; `moveItem` into a
  container stows it, and an item inside a container is always stowed. Removing a dropped
  container leaves what it held on the ground. The document holds no more than two hands' worth, and the server
  refuses holding past that (`handsFull`), wearing what isn't armour or worn (`notWearable`), a second suit of armour
  (`armorWorn`) and a two-handed item in one hand (`needsTwoHands`).
- **Investing.** `investItem { id, invested }` invests an item with the `invested` trait, or armour with runes
  (`notInvestable` otherwise), while it is worn or held as it is used (`investNotWorn`), at most 10
  (`investmentFull`). An invested item taken off stays invested and counts against the limit, but does nothing until
  it is worn or held again.
- **In play.** An item works on the character while it is carried as it is used: armour worn, a shield or weapon
  held (a two-handed one in both hands), anything on the body (worn, tattooed, implanted, affixed) worn, and an item
  with no usage either way (`equippedState`). Its physical benefits need only that. Its magic, with the `invested`
  trait, also needs it invested (`activeState`). Each item whose magic works is a grant root with an `inventory`
  hop whose state is `worn`, `held` or `invested`, so its rule elements, and those of what it grants, are in play
  with that origin (`equippedRules`). Worn armour adds its bonus to AC as an `item` line named by the armour and sets
  the Dexterity cap; while it is invested, its potency rune adds to that line and its resilient rune adds an `item`
  line to every save. Each held weapon is a Strike input with its potency and striking grades (`equippedInputs`).
  Strikes on the sheet are [#482](https://github.com/DavidDudson/pioneer/issues/482); armour's check and Speed
  penalties wait for skills and Speed on the sheet.
- **Runes.** An item's `runes` are those etched onto it, over those its content comes with
  ([ADR-0042](../adr/0042-etched-runes-stored-over-content.md)). `etchRune { id, rune }` etches a fundamental rune at
  a grade (potency and striking on a weapon, potency and resilient on armour, reinforcing on a shield; 1 to 4, 6 for
  reinforcing) or a property rune for that kind of item, at most one per grade of potency (`propertyRunesFull`).
  `eraseRune { id, rune }` erases an etched rune, and `transferRune { id, to, rune }` moves one onto another item it
  goes on that hasn't that fundamental rune. A specific item's fundamental runes only go higher (`runeNotHigher`), and
  its property runes can't be etched, erased or moved (`specificRunes`). Property runes past the potency grade stay
  etched and do nothing; those that work are grant roots with their host's inventory hop. The sheet names an item with
  its runes, as the rules write them ("+1 Greater Striking Flaming Longsword"); a specific item keeps its own name.
- **Grouping.** The sheet lists loose items worn, held, stowed and dropped as they are carried, and each container's
  contents beneath it. The investments panel counts invested items against the limit and lists the breakdown lines
  each adds to the sheet's statistics. A Bulk meter shows the Bulk carried against the limits in words.
- **Bulk.** Worked out on every read, never stored, in tenths ([ADR-0027](../adr/0027-equipment-facet-units.md)): an
  item's `bulk` times its quantity, or for `bulkPer` items only whole batches, with lines of the same content added
  up first (5 arrows and 5 more are light, 9 are nothing). A container adds what it holds less the Bulk it ignores
  (`ignored`, a backpack's first 2) however it is carried, unless it holds more than its `capacity`; its own Bulk is its
  `heldBulk` when it isn't worn. Coins weigh 1 Bulk a thousand, of every kind together. Dropped items, and what they
  hold, weigh nothing, and so does an item no loaded pack has. The limits drop the fraction: a character carrying
  more than 5 plus its Strength modifier is encumbered, and more than 10 plus it is over its maximum
  (`inventoryBulk`). Over the maximum is shown, never refused, since a drop in Strength or a Foundry sync can put a
  character there. While encumbered, the packs' `condition:encumbered` is a grant root with a `condition` hop, never stored
  ([ADR-0039](../adr/0039-derived-conditions-are-grant-roots.md)), so its rule elements reach the statistics beside
  the active items' (`equippedRules`); with no such entry loaded, the
  meter still says encumbered.

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
Edits stay field-level commands (`selectSlot`, `giftItem`, `setHp`, `addCondition`), so the API stays small and each
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
