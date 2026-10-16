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
  appearance: RichText; // plain paragraphs the sheet edits as text (Exploration tab)
  personality: RichText;
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
  hp: { damage: number; temp: number }; // damage taken since full, never the current total (ADR-0004)
  conditions: readonly ActiveCondition[]; // content ref, value, duration, source event
  effects: readonly ActiveEffect[]; // spell/feat effects, temporary boons: source, lifetime, uses left
  resources: Record<ResourceKey, number>; // points spent per pool: hero points, focus points (#345); spell slots and ability uses (#346); item uses follow (#638)
  toggles: Record<ToggleKey, { on: boolean; suboption?: Slug }>; // RollOption toggles (e.g. rage, Double Slice second attack); set by the setToggle play command, read by the grants engine
  dying: number; // 0 to 4; reaching 4 less doomed is death (#344)
  wounded: number;
  doomed: number;
  dead: boolean; // recorded when dying reaches 4 less doomed; a later change to either never undoes it
}
```

The schema is `CharacterDocumentSchema` in `libs/character/domain`. It is strict: a field it doesn't name, such as a
stored total, is rejected. `inventory` holds items and coins ([Inventory](#inventory)). `play`, `boons` and
`overrides` start empty and gain their fields with the epics that own them
([#38](https://github.com/DavidDudson/pioneer/issues/38), [#39](https://github.com/DavidDudson/pioneer/issues/39),
[#34](https://github.com/DavidDudson/pioneer/issues/34)). A selection is a `ChoiceValue`: a content id or a slug.

`play.hp` stores the `damage` taken since full and the `temp` Hit Points, never the current total
([ADR-0004](../adr/0004-store-inputs-not-derived-values.md)): current Hit Points are the derived maximum less the
damage (`currentHitPoints`), so a level or Constitution change moves them with the maximum. Play state is saved
apart from the build with its own revision (`PATCH /characters/:id/play`, `PlayCommand`), so a play edit never
changes the character's version and a build save never touches it.

The death track (`dying`, `wounded`, `doomed`, `dead`) sits beside `hp` and follows the same commands
([#344](https://github.com/DavidDudson/pioneer/issues/344)). Damage that takes a character to 0 Hit Points gains
dying 1 plus wounded (dying 2 plus wounded on a critical hit); damage that gets through at 0 raises dying by 1 (2 on a
critical hit) without wounded again. A recovery check is a flat check against DC 10 plus dying, rolled on the sheet's
roll card: the command carries its degree, which lowers dying by 2 or 1 on a success or raises it by 1 or 2 on a failure.
Losing dying, by that check or by Hit Points back above 0, gains wounded 1 (or one more). Death is reached at dying 4
less doomed and recorded in `dead`, which only an explicit `setDying` correction clears. `setWounded` and `setDoomed`
set the other two conditions by hand, for an effect that gives doomed or a mistake at the table. None of these needs a
maximum Hit Points value, so a character without a class can still carry the conditions.

`resources` holds the points **spent** from each pool, not the points held, so a pool that grows or shrinks with the build
keeps what was spent ([#345](https://github.com/DavidDudson/pioneer/issues/345)). Points held are the maximum less what
is spent (`currentResource`): 3 hero points, and a focus pool of one per non-cantrip focus spell, at most 3, from
`characterFocus`. `spendResource`, `regainResource` and `setResource` hold the points within 0 and the maximum, and
the maxima are derived only for those edits. Spending every hero point while dying is Heroic Recovery: dying ends and
wounded stays. Setting hero points to 0 is a correction and does not stabilise.

`resources.slots` and `resources.uses` hold the same kind of input for counted resources ([#346](https://github.com/DavidDudson/pioneer/issues/346)):
slots spent per spellcasting entry, optional pool and rank (`<entry>:<rank>`, `<entry>:<pool>:<rank>`; cantrips are not
counted), and uses spent per feat, class feature or action with a `frequency`, keyed by content id, and per activation
with a `frequency` of an inventory item, keyed `<item>:<slug>` by the inventory item and the activation's slug.
Maxima come from the spellcasting build and the content's `frequency`, each with the `Boundary` it comes back on
(`round`, `turn`, `rest`, `day`, `session` or `manual`). The boundary is derived from the build and content, never
stored, so a content change moves it with the maximum. `spendSlot`, `refundSlot`, `spendUse` and `refundUse` hold the
count within 0 and the maximum, and leave a key the build does not give as it was. A line of several items has that
many uses of each activation, since each item is used up on its own; an activation on a rune etched onto an item is
not counted yet.

A held wand has a cast and an overcharged cast, counted apart from activations under `wand:<item>` and
`wand:<item>:overcharge`, both on the `day` boundary. The cast has the consumable's `uses` per item (once when absent);
the overcharge has one per item.

`resources.staff` holds the charges of the one staff prepared for the day ([#366](https://github.com/DavidDudson/pioneer/issues/366)),
keyed by inventory item: `{ max, spent }`. Unlike a slot or a use, the maximum is stored, since daily preparations set it
from the character's highest spell rank (plus the rank of a slot expended) and the content does not give it. Held
charges are `max` less `spent`. Daily preparations replace the whole record, so at most one staff has charges and
unspent charges are lost. The `dailyPreparations` command takes an optional `staff` (an inventory item) and `slot`
(`{ entry, rank }`); a staff the character does not have, or a slot of an entry that is not prepared, is refused.

`conditions` holds one instance per condition put on the character ([#348](https://github.com/DavidDudson/pioneer/issues/348)):
an instance id, the condition's content id, its value when it is valued, a duration (`rounds`, `untilStartOfTurn`,
`untilEndOfTurn`, `unlimited` or `sustained`) and the campaign event that applied it. `addCondition`, `setConditionValue`
and `removeCondition` edit them; the server refuses a condition the content lacks, a valued one with no value, a value on
one without, and an instance the character does not have. The engine puts each instance in play as a grant root behind a
`condition` hop that carries the value and the event, so breakdowns name them ("frightened 2, applied by Demoralize").
Implied conditions come through the condition's own `GrantItem`; a condition another active one `overrides` is
suppressed while that one lasts; and however many instances of a condition there are, the character has it once, at the
highest value. Durations are stored, not counted down yet.

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
  them on. It plans feats, skills and boosts; spell slots are a follow-up. A planned selection that stops being
  valid is flagged at its level, like any other invalid choice.
- If content changes (errata, a homebrew edit) and a selection becomes invalid, the slot is flagged on the sheet
  with the reason. It is never deleted silently.
- Retraining is changing a selection; the audit log keeps the history.

The player picks with `selectSlot { slot, selection }` and empties a slot with `clearSlot { slot }`, each a PATCH
audited by name. `selectSlot` resolves the character's grants over its other picks at every level from 20 down,
with `ancestry`, `heritage`, `background`, `class` and `deity` as root slots (`CHARACTER_ROOT_SLOTS`), and refuses
with a reason when the slot is open at no level up to 20 (`character.validation.slotNotOpen`) or offers the selection
at none (`character.validation.selectionNotOffered`). Only a new selection is checked: one already stored stays, however
the level or content changes.

A feat slot (a `ChoiceSet` querying feats, on a class, an ancestry or any granted feature) is read at the level it
opens, over the picks below it with its own pick left out (#466). It offers the feats of its kind up to that level,
each with its `prerequisitePredicate` read three-valued against the character's facts there: its roll options, its
skill and Lore ranks with its skill picks so far, and its attribute modifiers (`attribute:<a>:mod:<n>`, known within
prerequisites, so a missing one is false). Perception ranks aren't read, so a Perception prerequisite is unknown: the
import drops some features that raise Perception, and any rank given would settle the comparison. A feat with printed
prerequisites but no predicate is unknown too. `selectSlot` refuses a feat whose prerequisites are not met
(`character.validation.prerequisitesNotMet`), and a feat above the slot's level as not offered, though a higher slot
would take it. Unknown is offered and accepted, never refused. A taken feat whose prerequisites stop holding reads
invalid at its slot (`rules.choices.invalid.prerequisitesNotMet`). Skill ranks a feature's dropped rules would raise
(Skill Training, a Lore feat) are missing from the facts, so such a prerequisite reads not met until the import
models them.

The heritage slot is `within` the ancestry slot: it offers the heritages whose `ancestry` is the picked one, and the
versatile heritages, which have none. An edit that leaves a heritage its new ancestry doesn't offer (picking another
ancestry, or clearing it) clears that heritage in the same write, audited as the edit's own command, and the PATCH
answer names it under `cleared`, once: the sheet shows it until dismissed or the next edit. This is the one
exception to keeping picks: the heritage belongs to the ancestry the player just replaced, so keeping it would only
flag a choice they already undid. A heritage that stops fitting without an edit (an errata, content not loaded) stays
and reads invalid, like any other pick.

The sheet's Build section summarises the character: class, subclass, ancestry, heritage, background, deity, key
attribute, size and traits, each empty part saying what to pick, with Edit build taking focus to the pickers. The
traits are the ancestry's, with those `ActorTraits` elements add and without those they remove (a holy cleric's,
a versatile heritage's).

The deity slot is optional ([ADR-0046](../adr/0046-deity-is-an-optional-root-slot.md)): any character may pick a
deity, and an empty slot is listed under Choices only while something needs it, a cleric's Deity feature. A deity sets
what its follower's features read: `deity:primary:font:heal`, `deity:primary:sanctification:can:holy`,
`deity:primary:favored-weapon:scimitar`. So a cleric's Divine Font offers the fonts its deity has, and its
sanctification choice holy or unholy as the deity allows, or none unless the deity requires one. Before a deity is
picked, Divine Font offers nothing and the sanctification choice only none. The sheet's Deity section, after Build,
picks the deity by name and shows the one the server read (`CharacterSheet.deity`): its divine font, sanctification,
domains and alternate domains, favoured weapons, divine attributes and skills, then its description, which holds its
edicts and anathema.

A cleric's deity grants through Deity (Cleric)'s rule elements
([ADR-0048](../adr/0048-a-clerics-deity-grants-through-rule-elements.md)): a divine skill, picked from the deity's
(`deity:primary:skill:<skill>`) and trained; trained proficiency in its favoured weapons (`attack:favored-weapon`,
which a doctrine raises); its spells in the cleric's own prepared slots at the ranks it grants them; the holy or unholy
trait its sanctification picks; and a fist Strike when the deity favours the fist. The sheet's Strikes section lists
each held weapon's Strike, then such a fist.

The class slot's pick grants its class features by level and opens the slots its features ask for. The subclass slot
is the `ChoiceSet` among them that queries class features tagged with the class's `subclass` (a cleric's doctrine, a
wizard's arcane school); a class without one (fighter) has none. The key attribute is the class's boost slot
(`boost:1:class:0`), there only when the class allows more than one. Identity picks the class, then the subclass and
key attribute when the class asks for them. The Class features section lists each feature the class grants at the
character's level with where it came from, "from Cleric, level 1", the level being that of the class's grant (a
subclass feature reads the level of the feature that offered it). Changing the class keeps every pick that depended on
the old one: the subclass and a key attribute it no longer offers read hidden, and come back with the class.

**Dual Class** ([#705](https://github.com/DavidDudson/pioneer/issues/705)): a variant rule whose `structure` says
`secondClass` adds a second root slot, `second-class`, beside `class` (`characterRootSlots`). It offers the same
classes; its pick grants that class's features and opens the feat slots they ask for, each keyed by its own entry, so
nothing collides with the first class's. A proficiency the two classes raise takes the better rank (`ranksInPlay`'s
highest raise wins). The second class has a key attribute boost of its own, `boost:1:second-class:0`, labelled
"Second class key attribute"; its subclass is the `ChoiceSet` tagged for that class. Skill training and increases,
Hit Points and the class DC still read the first class. The pick is kept when the variant is off, read again when it
comes back, and the second class is a pick like any other: schema version 7 adds it. A rogue's racket widens the key
attribute options of both classes, since the options are not tracked per class yet.

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
its entries' traditions.

A pool's slots are prepared the same way, `prepared:<entry>:<pool>:<cantrip|rank>:<n>`, after the entry's own
([ADR-0045](../adr/0045-pool-spells-are-rule-elements.md)): each offers the spells the pool's `PoolSpells` elements
name that fit its rank, whatever their tradition or rarity. A divine font takes heal or harm once the font is picked
(Divine Font's choice, of the deity's fonts), a curriculum its school's spells. The sheet
lists them after the entry's own under the name of what gave the pool, and says when a pool takes nothing yet.

A spontaneous entry's repertoire is choice slots too, `repertoire:<entry>:<cantrip|rank>:<n>`
([ADR-0047](../adr/0047-signature-spells-are-rule-elements.md)): as many of each rank as the entry has slots, since the
repertoire grows as its slots do, each read like a prepared slot. A spell learned in a slot above its own rank is known
heightened to that rank (Magnum Opus's two 10th-rank spells for one slot are not counted yet, #599). Once Signature
Spells is in play (a bard's at 3rd level), the entry has a signature slot per rank of its slots,
`signature:<entry>:<rank>`, offering the spells its repertoire knows at that rank; a signature spell is cast at any
rank from its own up to the entry's highest below 10th, any other repertoire spell only at the rank it was learned. A
signature pick the repertoire no longer knows at its rank reads invalid (`rules.choices.invalid.spellNotInRepertoire`).
The sheet lists a spontaneous entry's repertoire rank by rank as "Spell repertoire", each rank's signature picker
after its spells and a note saying where the signature spell is cast, or that the rank's spells come first.

A spontaneous caster swaps one repertoire spell for another each time they level up (#594). The build keeps
`repertoireSwaps`, the slot swapped at each level; replacing or emptying a repertoire slot that opened below the
character's level and holds another spell is that level's swap, and a second slot the same level is refused
(`character.validation.repertoireSwapUsed`) until retraining (#515) exists. Filling an empty slot, or changing one that
opened at the character's level, costs nothing, and the swapped slot can change again. A signature pick that held the
spell swapped out moves to the one that replaces it, at the rank it was learned; emptying a slot leaves the signature
pick reading invalid until it is picked again. Lowering the level and swapping there records a swap at that level too.

A `RepertoireSpells` element ([ADR-0062](../adr/0062-repertoire-spells-are-a-rule-element.md)) fills the first
repertoire slot of a rank with a spell the entry must know: a sorcerer's bloodline gift, an oracle's granted
spell. The slot reads filled and `granted` in the character read, offers that spell alone, and shows on the
sheet as read-only text; a signature slot offers it like any repertoire spell. A gift of a rank the entry has no
slots of yet is not in the repertoire.

A focus entry has the focus spells its `FocusSpells` elements name
([ADR-0050](../adr/0050-focus-spells-are-rule-elements.md)), cast heightened to half the level rounded up, focus
cantrips too. The focus pool holds one Focus Point per focus spell that isn't a cantrip, at most 3, worked out from
the spells (`characterFocus`) for the play state's focus points (#345). A choice that grants them (a domain, a warden
spell) is a listed `ChoiceSet`, picked in Choices. The sheet lists focus spells under Spellcasting, by entry, with the
pool and the rank they are cast at.

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

The level timeline ([#492](https://github.com/DavidDudson/pioneer/issues/492)) is where the plan is made: a feat, skill
or boost slot above the character's level has a picker on its row, a plain `selectSlot`, so planning then levelling up
equals picking at the level. A feat's picker offers the feats of its kind as of the slot's level, with the prerequisites
the character will have met by then. Spell slots are not planned yet: they open at the character's level only.

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

A trained skill slot also reads the skills it cannot offer, with what trains each: the entries of the effective set that
raise it (the class, the background) and the earlier slots whose pick took it (`SkillSlot.trained`). The sheet shows
them beside the slot's picker ("Already trained in Religion (from Cleric)"), so the player sees where a training comes
from before choosing another skill ([#672](https://github.com/DavidDudson/pioneer/issues/672)).

The background, class, subclass and feat pickers mark each option that would train a skill again
([#674](https://github.com/DavidDudson/pioneer/issues/674)): `repeatedTrainings` resolves the grants with the option in
its slot (the slot otherwise empty, as `selectSlot` reads it) and keeps the skills the option adds a trainer of while
another entry or a trained skill slot's pick trains them already. The option's description reads "Already trained in
Religion" and it stays selectable. A skill the option leaves to its own `ChoiceSet` is not counted.

A skill two sources train anyway is noted beside its row in the Skills section
([#673](https://github.com/DavidDudson/pioneer/issues/673)): `skillsTrainedTwice` reads the entries of the effective
set that train each skill at the character's level and the trained skill slots' picks that name it, and keeps those
with two or more sources. The note names the first two ("Trained by Acolyte and Cleric; the second training is lost");
a skill is trained once, so the builder adds no substitute trained skill after 1st level. The 1st-level substitute for
class and background (Player Core) stays, as `duplicateTrainings` gives it.

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

A feat slot reads the lock over the feats picked in the feat slots before it (lower level first, in the order found
within a level); a feature's grant is not counted. Every dedication taken so far with fewer than its lock of other
archetype feats keeps another archetype's dedication out of reach, and the offer names the first such archetype with
the feats still needed (`FeatOption.locked`). `selectSlot` refuses a locked dedication
(`character.validation.dedicationLocked`), and a taken one reads invalid at its slot
(`rules.choices.invalid.dedicationLocked`), so the lock holds across levels, and replacing a feat that lifted it
flags the dedication after. The sheet's picker shows the dedication disabled, with the archetype and the count.

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
  `buyItem { item, quantity, container? }` (adds and pays with change made; the server works out the cost from
  content, see [Shop](#shop)), `giftKit { kit, container? }` and `buyKit { kit, container? }` (add every item in a
  kit; see [Shop](#shop)),
  `removeItem { id }`, `setItemQuantity`, `moveItem { id, container? }` (no container takes it out),
  `renameItem { id, name? }` (no name goes back to the content's) and `setCoins { coins }`. Each is a PATCH audited
  by name. The server refuses an item the character hasn't (`character.validation.itemNotFound`), a container that
  isn't there
  (`containerNotFound`), one inside itself or something it holds (`containerInsideItself`), content no loaded pack
  has as an item (`unknownItem`) or as a kit (`unknownKit`), stowing in an item that holds nothing (`notAContainer`)
  and a purchase the coins don't cover (`cannotAfford`, `cannotAffordKit`).
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
- **Broken.** `setItemBroken { id, broken }` marks an item broken, or repaired. It is inventory state, not play
  state, so a broken item stays broken through daily preparations until the player marks it repaired. A broken
  wand can't be cast or overcharged. A wand broken or destroyed by an overcharge is changed by the play command
  that overcharged it (see "Staves and charged items" in [play-and-campaigns.md](./play-and-campaigns.md)).
- **In play.** An item works on the character while it is carried as it is used: armour worn, a shield or weapon
  held (a two-handed one in both hands), anything on the body (worn, tattooed, implanted, affixed) worn, and an item
  with no usage either way (`equippedState`). Its physical benefits need only that. Its magic, with the `invested`
  trait, also needs it invested (`activeState`). Each item whose magic works is a grant root with an `inventory`
  hop whose state is `worn`, `held` or `invested`, so its rule elements, and those of what it grants, are in play
  with that origin (`equippedRules`). Worn armour adds its bonus to AC as an `item` line named by the armour and sets
  the Dexterity cap; while it is invested, its potency rune adds to that line and its resilient rune adds an `item`
  line to every save. Each held weapon is a Strike input with its potency and striking grades (`equippedInputs`),
  marked favoured when the deity favours its base (ADR-0048). The sheet's Strikes section lists each Strike with its
  traits, its attack at the first, second and third attack of a turn (agile weapons take -4 and -8), its damage, and
  the breakdowns of the attack and the damage bonus. A held shield's Hardness, Hit Points and Broken Threshold (half
  its Hit Points) sit beside them (`heldShields`); a reinforcing rune does not change them yet.
  Armour's check and Speed penalties wait for skills and Speed on the sheet.
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
  A batch price ("1 sp for 10") is shared over the batch and rounded up to the copper, and an item with no price
  costs nothing. Payment uses exact coins, largest first, where the purse allows; otherwise it breaks the smallest
  coin that covers what is still owed and gives the change in the largest coins. The shop shows the cost in gold,
  silver and copper, as prices are written, beside the character's coins, and disables **Buy** with the reason when
  they fall short.
- **Add without paying**: the same picker, no coins move. For loot, a GM's reward or starting gear. The audit log
  records it as a gift, apart from a purchase.
- **Kits** sit in their own list below the items: every kit the loaded packs offer, with its price. Picking one
  shows what it holds, a container's contents under it. Buying it (`buyKit`) or adding it without paying
  (`giftKit`) adds every item in it in one write, each its own line: loose or in the container picked, and what a
  container in the kit holds stowed inside that container (the Adventurer's Pack's backpack holds the rest). A kit
  is one purchase at its own price, not the sum of its items, and is added whole or not at all: a kit holding an
  item no loaded pack has is refused (`unknownKitItem`), as is one whose lines would take the inventory past its
  limit (`kitOverfills`), or one that packs items inside an item that holds nothing (`kitNotAContainer`). The shop
  leaves out any kit it would refuse whatever the inventory holds. Foundry pf2e (`pf2e-8.6.0`) has no class kits,
  so the Player Core import offers only the Adventurer's Pack; a pack that adds class kits needs no change here.

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
  ([#549](https://github.com/DavidDudson/pioneer/issues/549)) is carried when the second class matches loaded content
  and a pack defines the Dual Class variant rule: the second class goes in its slot, the second entry of
  `classBoosts` in its `secondClass` boost set, and the variant rule is enabled for the character (a
  `character_variant_rules` row, as the owner enabling it would write). Otherwise the report lists the second class as
  unmatched, or as not offered when the content matches but the variant isn't there, and nothing is enabled.
- **Pioneer JSON:** the `CharacterDocument` without its id and owner, with content named by pack and slug
  ([ADR-0056](../adr/0056-pioneer-character-file-format.md)). Homebrew entries referenced by the character are
  embedded so the file is portable; an import makes them for the importer or reuses identical ones, and reports a
  clash instead of overwriting ([ADR-0059](../adr/0059-pioneer-files-embed-the-homebrew-they-use.md)).
- **Foundry export:** see [play-and-campaigns.md](play-and-campaigns.md#foundry-export).
