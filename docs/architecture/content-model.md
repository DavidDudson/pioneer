# Content model

Content is everything the rules define: traits, statistics, conditions, actions, ancestries, heritages,
backgrounds, classes and their features, feats, spells, equipment, runes, deities, languages, creatures. It is data
in the database, never code.

## Content entry

Every entry, of every kind, shares one envelope. Kind-specific data hangs off it with its own zod schema.

```ts
interface ContentEntry<K extends ContentKind> {
  id: ContentId; // UUIDv5 of `<pack>/<slug>`
  pack: PackId;
  kind: K;
  slug: EntrySlug; // `<kind>:<name>` (`ancestry:human`), permanent once published (ADR-0034)
  name: string;
  level?: number; // 0 to 30; a creature always has one, from -1 to 25
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  traits: readonly TraitSlug[];
  sources: readonly SourceRef[]; // at least one, see below
  description: RichText; // ORC rules text for official content, author text for homebrew
  rules: readonly RuleElement[];
  display?: DisplayHints; // e.g. feat display category override, see play-and-campaigns.md
  externalIds?: { foundry?: string; aon?: AonUrl; pathbuilder?: string };
  supersedes?: readonly ContentId[]; // remaster entry replacing a legacy one
  data: KindData[K];
}
```

`ContentEntry` in `libs/rules/sdk` (`content-entry.ts`) is this envelope as a zod schema. `kind` picks the `data`
schema from a kind registry (`KIND_DATA`, `kind-data.ts`); a kind with no schema yet is an error naming it. On top
of the field schemas it checks that `id` is UUIDv5 of `<pack>/<slug>`, that the slug names the entry's `kind`,
that there is at least one source, that traits are unique, and that `supersedes` never holds the entry's own id.
The rules playground's "Content entry" mode loads an example per registered kind. Packs are stored as entries (see
"Packs and storage"); until the registry serves entries directly, `contentPackFromFiles` (`content-pack-file.ts`)
turns them into the definitions it holds today and wraps each in `PackEntry`.

### Kinds

| Group      | Kinds                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Rules core | `statistic`, `trait`, `condition`, `action`, `damage-type`, `sense`, `language`, `variant-rule`                  |
| Build      | `ancestry`, `ancestry-feature`, `heritage`, `background`, `class`, `class-feature`, `feat`, `archetype`, `deity` |
| Magic      | `spell` (incl. focus spells and cantrips), `ritual`, `spellcasting-tradition`                                    |
| Equipment  | `weapon`, `armor`, `shield`, `equipment`, `consumable`, `rune`, `treasure`, `kit`                                |
| Play       | `effect` (spell and feat effects, GM effects)                                                                    |
| Bestiary   | `creature`, `hazard` (later milestone)                                                                           |

Class progression (features by level, feat slots, skill increases, boosts) is data on the `class` entry, expressed
as `GrantItem` and slot-granting rule elements keyed by level, and its skill increase levels. The builder's feat and
subclass slots fall out of the engine; its boost and skill slots are the character domain's, with Player Core's default
increase schedule and rank caps by level in code ([ADR-0038](../adr/0038-skill-slots-come-from-class-data.md)).

Statistics are content too: a `statistic` entry names a selector, its domains, an actor-only base formula, and
whether it is a check or a DC (see [rules-engine.md](rules-engine.md#statistics-are-content)).

#### Rules core data

Each kind's `data` follows what Foundry pf2e stores for it, in Pioneer's words. What an entry does to statistics is
in its `rules`, not repeated in `data`; a condition's `implies` is the one exception, below. Schemas live in
`libs/rules/sdk`, registered in `kind-data.ts`.

| Kind           | `data`                                                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `condition`    | `valued`; `group?`, Foundry's sheet grouping, which says nothing about stacking; `overrides`; `implies`                                                                                                                            |
| `action`       | `cost?`; `upTo?`; `skills?`; `minimumProficiency?`; `category?`; `modes?`; `universal?`; `requirements?`, a predicate; `requirementsText?` and `trigger?` as rich text; `triggerEvent?`; `autoApply?`; `frequency?`; `selfEffect?` |
| `damage-type`  | none yet; a type's group stays in `DAMAGE_GROUP_TYPES`, as Foundry keeps it in code                                                                                                                                                |
| `sense`        | `acuity?`, the acuity the sense always has; `unlimitedRange?` (darkvision)                                                                                                                                                         |
| `trait`        | `appliesTo`: each kind that carries it once, from the Foundry trait list it sits in                                                                                                                                                |
| `language`     | none yet; rarity is the envelope's                                                                                                                                                                                                 |
| `variant-rule` | `structure?`, the structural changes it needs beyond `rules` (`extraSlots`, `secondClass` for Dual Class); `rules` apply to every character it is enabled for                                                                      |

- `condition`: `valued` says whether it takes a value (Frightened 2) or not (Blinded). `group` is one of
  `abilities`, `attitudes`, `death`, `detection`, `senses`. `overrides` lists the conditions it replaces
  (Blinded overrides Dazzled), and is how conditions exclude each other. `overrides` and `implies` are `ContentId[]`.
- `action`: `cost` is an `action-cost` glyph, absent for a passive ability. `upTo` makes the cost variable, the user
  picking how many: a count above a `one`, `two` or `three` cost, at most six, as an activity can span two turns.
  `skills` are the skills it uses, by selector (`skill:athletics`). `frequency` is `max` uses `per` turn, round,
  minute, ten minutes, hour, 24 hours, day, week, month or year. `selfEffect` is the effect it applies to
  the user, by `ContentId`. `triggerEvent` and `autoApply` are below.
- **Trigger events.** An action or effect that fires on an event has a `triggerEvent`: an `event` (`initiative`,
  `turn-start`, `turn-end`, `cast-spell`, `strike`, `damage-taken`), each from the point of view of the character it
  belongs to, and an optional `predicate` over the event's roll options. The spell cast or the weapon used is the
  event's `item`, as in Foundry, so "you cast a focus spell" is `cast-spell` with `item:trait:focus`. The rich text
  `trigger` stays the wording shown. `autoApply: false` makes a free, beneficial ability prompt rather than apply at
  once, and needs a `triggerEvent` (play-and-campaigns.md, "Triggered abilities"). A feat or class feature that is an
  action carries both on its `action`.

Two checks span fields: a reaction needs a `trigger`, and every condition in `implies` needs a `GrantItem` of it in
`rules` with no predicate. Foundry applies implied conditions (Grabbed's Off-Guard and Immobilized) with
`GrantItem`, and so does the engine; `implies` is the list the sheet shows. The check runs one way: a condition may
grant more than it lists.

#### Build data

The same rule holds for build kinds: `data` is what Foundry pf2e stores, less what rule elements already express.
Lists of attributes, slugs and ids name each item once.

| Kind               | `data`                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ancestry`         | `hitPoints`, `size`, `speed`, `reach`; `boosts`; `flaws`; `languages`; `additionalLanguages`; `vision?`                                                     |
| `ancestry-feature` | `action?`; granted by its ancestry or heritage, never picked                                                                                                |
| `heritage`         | `ancestry?`, absent for a versatile heritage                                                                                                                |
| `background`       | `boosts`; trained skills and lore are `Proficiency` elements, its skill feat a `GrantItem`                                                                  |
| `class`            | `keyAttribute`, the attributes it may be; `hitPoints` per level; `additionalSkills`; `skillIncreaseLevels?`; progression in `rules`                         |
| `class-feature`    | `action?`; `tags?`; `keyAttributeOptions?`; always has a `level`                                                                                            |
| `feat`             | `category`; `prerequisites?` as rich text; `prerequisitePredicate?`; `onlyLevel1?`; `maxTakable?`; `action?`; `skills?`; `archetype?`; always has a `level` |
| `archetype`        | `dedication`; `multiclass?`, the class it is the multiclass archetype of                                                                                    |
| `deity`            | `category`; `sanctification?`; `domains`; `font`; `attributes`; `skills`; `weapons`; `spells`                                                               |

- **Boosts.** A boost is the attributes it may go to: one for a fixed boost, all six for a free one. An ancestry
  lists up to four, a background two (Farmhand: Constitution or Wisdom, then free). `flaws` are fixed attributes.
- **Languages.** `languages` and `additionalLanguages.options` are `language` entries by `ContentId`;
  `additionalLanguages.count` is the number picked beyond those granted, before the Intelligence modifier.
  A feat, heritage or class feature teaches languages with `Language` elements, which the character model reads
  (character-model.md, "Languages").
  `vision` is the `sense` entry an ancestry sees with (darkvision, low-light vision), absent for ordinary vision.
- **Ancestry features.** Keen Eyes, Plant Nourishment and the like are their own kind, `ancestry-feature`, as class
  features are, rather than a feat category: an ancestry feat slot queries feats by the ancestry's trait, which its
  features carry too, so as feats they would be offered there. An ancestry or heritage grants each by `GrantItem` in
  its `rules`, and its roll option is `feature:<slug>`, as in Foundry.
- **Key attribute options.** A class feature's `keyAttributeOptions` widen its class's `keyAttribute` while the
  character has it at 1st level: a rogue keys off Dexterity, or Strength once Ruffian is its racket (Mastermind
  Intelligence, Scoundrel Charisma). A key attribute picked that the class no longer offers is kept, invalid.
- **Class progression.** Perception, save, attack, defence, skill and class DC ranks are `Proficiency` elements,
  later ranks behind a level predicate (`{ "gte": ["self:level", 7] }`). Each class feature is a `GrantItem`, and
  each feat slot a `ChoiceSet` querying feats (`["item:trait:fighter", { "lte": ["item:level", "self:level"] }]`)
  behind the level it opens at. Foundry's `classFeatLevels` and the other feat level lists have no field here; its
  `skillIncreaseLevels` is the one kept (Player Core's 3rd and every second level when absent; a rogue's every level
  from 2nd), as the builder opens skill increase slots itself (character-model.md, "Skills"). The
  subclass (a doctrine, muse, order or school) is a class feature's `ChoiceSet` querying class features by tag
  (`["item:tag:cleric-doctrine"]`), with the `GrantItem` of its pick; a class feature's `tags` are its roll options
  `tag:<tag>`, and the class's `subclass` names the tag its subclass options carry, since a class may have more than
  one such query (a wizard's arcane school and thesis) ([ADR-0036](../adr/0036-class-names-its-subclass-by-tag.md)).
- **Feats.** `category` is Foundry's: `ancestry`, `class`, `general`, `skill` or `bonus`; an archetype feat is a
  class feat with the `archetype` trait. `maxTakable` is a count or `unlimited` (Foundry's `null`), once when
  absent. A feat with `onlyLevel1` must be level 1. `action` is an `action` kind's `data`, for a feat or class
  feature used as an action. `skills` are the skills a feat is about (Assurance); `archetype` is the `archetype`
  entry an archetype feat belongs to, by `ContentId`. The sheet placement override is the envelope's `display`.
  Foundry's feature categories on the same item type go elsewhere:
  `classfeature` is the `class-feature` kind, `ancestryfeature` the `ancestry-feature` kind, and `calling`, `curse`,
  `deityboon` and `pfsboon` have no kind yet, so the importer reports them.
- **Prerequisites.** `prerequisites` keeps Foundry's text and gains `prerequisitePredicate?`, which the prerequisite
  pass derives where it can parse the text ("trained in Medicine", "Champion Dedication", "Strength +2"; Foundry
  import, Prerequisite enrichment). A feat with no predicate is offered as unknown under three-valued predicates
  (ADR-0002): shown with its text, never hidden, never treated as met. The coverage report lists the unparsed
  prerequisites.
- **Archetypes.** Foundry keeps them as journal pages; the importer builds the entry from the page and its
  dedication feat (Foundry import, Archetypes).
  `dedicationLock?` is how many other archetype feats a character needs before another dedication (2 when
  absent; character-model.md, Archetype dedications).
- **Deities.** `category` is `deity`, `pantheon`, `covenant` or `philosophy`. `sanctification` is `can` or `must`
  with `holy` and/or `unholy`. `domains` has `primary` and `alternate` domains, each one of Foundry's config keys
  (`DeityDomain`, apocryphal variants included; the import files Disorientation under `delirium`, Nothingness under
  `void` and Dragon under `wyrmkin`, as Foundry keys them). `font` is `harm` and/or `heal`, `skills` are statistic
  selectors, `weapons` base weapon slugs (a weapon's `baseItem`), and `spells` one spell per rank from 1 to 10. A
  philosophy has no font, domains or spells, and divine skills must be `skill:` selectors. A deity on a character
  sets `deity:primary:<slug>`, and under `deity:primary` its sanctification, favoured weapons and fonts, as Foundry
  does (ADR-0046), and its divine skills (`deity:primary:skill:medicine`, ADR-0048).

#### Magic and play data

Foundry pf2e stores a spell's range, targets, casting time and duration as free text; Pioneer stores them as
structures, and the importer reports a spell whose text doesn't map
([ADR-0021](../adr/0021-structured-spell-casting-fields.md)). Rule elements on a spell are rare: what it does beyond
its damage is its description, and the effects it applies are `effect` entries.

| Kind                     | `data`                                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spell`                  | casting fields; `traditions`; `damage`; `heightening?`; `counteraction?`                                                                                       |
| `ritual`                 | casting fields; `primary` check; `secondary` checks and `casters`                                                                                              |
| `spellcasting-tradition` | `skill`, the skill that recalls and identifies its magic (`skill:arcana`)                                                                                      |
| `effect`                 | `category`, `spell`, `feat`, `equipment` or `other` (a GM's); `duration`; `badge?`; `triggerEvent?` and `autoApply?`, as on an action; level is the envelope's |

- **Casting fields.** `rank` 1 to 10. `time` is `actions` with a glyph `cost`, and `upTo` for a range ("one to
  three actions", Heal), or `time` with a `count` of rounds to years ("3 days"). `range?` is feet, `miles` (whole
  or half, "half a mile"), `touch`, `planetary`, `interplanar` or `unlimited`, or `either` of two or three of
  those the caster picks from ("touch or 30 feet"). `area?` is a `shape` (`burst`, `cone`, `cube`, `cylinder`,
  `emanation`, `line`, `square`) and `size`, with a `width` on a line and `details` as rich text when the book
  narrows the area ("all squares in a 20-foot-radius burst that contain plants"). `targets?` lists the
  alternatives in `any` ("1 willing living creature or 1 undead"), and in `plus` targets taken as well ("1 ally and
  1 enemy"). Each has a `count`: a number (`upTo` for "up to"), `any` ("any number of creatures") or `all` with
  where they are, `within` the `area` or `range` ("enemies in the area"); `triggering` for "the triggering
  creature"; what it is (`creature`, `object`, `ally`, `enemy`, `corpse`, `weapon`, `item`, `spell-effect`, or the
  caster's `companion`, `animal-companion`, `familiar`, `eidolon`); `qualifiers` (`willing`, `living`, `dead`,
  `dying`, `sleeping`, `falling`, `flying`, `corporeal`, `unattended`, `magical`) and `traits` ("1 extraplanar
  creature", "1 animal"). `you` is `and` for "you and up to 4 allies", `or` for "you or 1 ally". `duration?` is a
  `time` (with `sustained` for "sustained up to 1 minute", or `upTo` for "up to 10 minutes", never both),
  `rolled` dice of a unit ("4d12 hours"), `sustained`, `until` the end of this turn, the start or end of the next
  (the caster's, or the target's `of: target`) or the next daily preparations, `unlimited`, `varies` when the
  text says how long ([ADR-0049](../adr/0049-spell-durations-the-text-gives-vary.md)), or `either` of two or three
  of those ("10 minutes or 8 hours", "1 round or sustained up to 1 minute"); an instant spell has none.
  `defense?` is a `save` (a `save:` selector and `basic`), the passive defence it is `against` (`ac` or a `save:`
  selector for that save's DC, Foundry's `passive`), or both; a spell attack is marked by the `attack` trait, as in
  Foundry. `cost?` and `requirements?` are rich text.
- **Spells.** Cantrips and focus spells are spells with the `cantrip` or `focus` trait, as in Foundry. `traditions`
  are `arcane`, `divine`, `occult`, `primal`. `damage` parts each have a `key` (Foundry's record key), a damage
  formula that may read the casting entry (`@spellcasting.attr`), a `damageType` (none when untyped: Disintegrate,
  Breath of Life), an optional `category`, `kinds` (`damage`, `healing` or both) and the `materials` it counts as
  (Moonbeam's `silver`). `heightening` is an
  `interval` (every so many ranks, add a formula to named damage parts and feet to the area) or `fixed` (at each
  listed rank above the spell's, replace at least one of damage, range, area, targets, duration, casting time or
  traits; `traits` is the spell's whole list then). `variants` are the ways to cast it (Heal's one-, two- and
  three-action versions, Gouging Claw's slashing or piercing), Foundry's `override` overlays: each has an optional
  `name` and at least one of `time`, `range`, `area`, `targets`, `duration`, `defense`, `damage` and
  `heightening` that it has instead of the spell's, the rest as the spell has it. A variant's `damage` is its whole
  list of parts and its `heightening` its whole heightening, so a reader never lays a variant over the spell (Foundry
  does, by part key). Spellcasting-entry `location` has no field yet.
- **Rituals.** Foundry stores a ritual as a spell with ritual data. A check is one of its `skills` (`skill:`
  selectors; `skill:lore` is any Lore, narrowed by `loreRelatedTo`), at a `proficiency` when it names one, or a
  `ranked` rank for each skill when they differ. It may have a `dc` of its own and a `pick` that says how its skill is
  chosen: by the `tradition` of the spell cast, or, for a secondary check, the skill the primary check `primary-used`
  or `primary-unused`. Each secondary check is its own.
- **Effects.** `duration` is a `time` of rounds to days with an `expiry` (`turn-start`, `turn-end`,
  `round-end`) and `sustained`, a `turn` (until the `turn-start` or `turn-end` of the turn it is applied in),
  `encounter` or `unlimited`. `badge` is a `counter` starting at `value` between
  `min` and `max`, with `labels` and `loop`, or a rolled `formula` that may `reevaluate` at initiative or a turn's
  start or end. Foundry's `tokenIcon`, `unidentified` and the context of the action that applied it are play
  state, not content.

#### Equipment data

Every item kind but `kit` always has a `level`, 0 to 30, and has the physical fields beside those listed. Foundry
pf2e's `ammo` items are consumables with the `ammunition` category, and its `backpack` items are equipment with a
`container` ([ADR-0023](../adr/0023-equipment-kinds-diverge-from-foundry-items.md)). Whether an item is equipped,
invested or identified is play state, not content.

| Kind         | `data`                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `weapon`     | `category`; `damage`; `usage`; `group?`; `baseItem?`; bomb and ranged fields; `runes?`; `staff?` |
| `armor`      | `category`; `acBonus`; `group?`; `baseItem?`; `dexCap?`; penalties; `strength?`; `runes?`        |
| `shield`     | `acBonus`; `hardness` and `hitPoints`, required; `baseItem?`; `speedPenalty?`; `runes?`          |
| `equipment`  | `usage?`; `container?`; `apex?`; `staff?`                                                        |
| `consumable` | `category`; `uses?`; `damage?`; `spell?`; `ammunition?`; `usage?`                                |
| `rune`       | `type`, `fundamental` (with `rune` and `grade`) or `property`; `etchedOnto`                      |
| `treasure`   | `category?`: `art-object`, `coin`, `gem` or `material`                                           |
| `kit`        | `price?`; `items`; no physical fields                                                            |

- **Physical fields.** `price?` is `coins` (`pp`, `gp`, `sp`, `cp`, at least one) for `per` items when sold in a
  batch; an item with no price has none. `bulk` is `negligible`, `light` or a whole number, for `bulkPer` items
  when not one (10 arrows are light, 1,000 coins are 1 Bulk). `size?` is medium when absent; `hardness?`,
  `hitPoints?` and `material?` (a precious material slug and its `grade`) complete them.
  `activations?` are the ways to activate it that have a frequency, each a `slug` (its name within the item), a `name`
  and a `frequency` as an action has. Foundry pf2e keeps no frequency on an item, so the importer reads it from the
  description's "Activate" and "Frequency" lines; one it cannot read is reported and left out.
- **Usage.** Foundry's `usage` string split into parts: `held` in `one`, `one-plus` or `two` hands; `worn`, with a
  `slot` slug (`cloak`, `backpack`) or none; `affixed`, `attached`, `applied` or `installed` `to` a slug
  (`armor-or-a-weapon`); or `tattooed`, `implanted`, `carried` or `other`. Armour and shields have none.
- **Weapons.** `category` is `unarmed`, `simple`, `martial` or `advanced`; `group` one of the remaster groups;
  `baseItem` the base weapon slug, which a deity's favoured `weapons` also name. `damage` is `dice`, a `die` (`d4`
  to `d12`) and a `damageType`, with `persistent` damage as a formula and type (bombs); with no `die`, `dice` is flat
  damage (a blowgun's 1), and 0 is none (a glue bomb). `range` is the range increment, `reload` the actions to
  reload, and `ammunition` the `type` it fires, or `builtIn`, with its `capacity`: the ranged fields. With no `type`
  and not built in, it fires any ammunition that isn't a magazine. Traits carry the rest (`versatile-p`,
  `thrown-20`). Alchemical bombs are weapons, as in Foundry; `splash` and `itemBonus` are their splash damage and
  attack bonus.
- **Armour and shields.** Armour `category` adds `light-barding` and `heavy-barding` to the proficiency categories.
  Penalties are their size: `checkPenalty` 1 is -1, `speedPenalty` 5 is -5 feet, where Foundry stores them
  negated. `strength` is the Strength modifier at which the penalties go away. A shield that is also a weapon says
  so with its `integrated-…` trait, and a specific one lists that weapon's `integratedRunes`.
- **Runes on specific items.** A specific magic weapon or armour has the `runes` it comes with: `potency` and
  `striking` or `resilient` grades 1 to 4, and `property` runes as `rune` entries, up to five. A potency
  rune's grade limits the runes etched later, not a specific item's, which may come with a property rune and no
  potency rune (a returning starknife).
  A specific shield has a `reinforcing` grade 1 to 6.
- **Runes.** Foundry stores a rune as equipment with an `etched-onto-…` usage and keeps what property runes do in
  code; here a rune is its own kind, and what a property rune does is its `rules`. A `fundamental` rune is
  `potency` (weapon or armour, separate entries), `striking` (weapon), `resilient` (armour) or `reinforcing`
  (shield), at a `grade` up to 4, or 6 for reinforcing. `etchedOnto` is the `item` (`weapon`, `armor`, `shield`)
  and a `restriction` slug from Foundry's usage (`melee`, `metal`).
- **Consumables.** `category` is Foundry's (`potion`, `scroll`, `wand`, `talisman`…) plus `ammunition`. `uses` is
  how many times it is used before it is spent, once when absent; a `kept` one stays when spent (a wand, cast once a
  day). `damage` is a formula, type and `kind`
  (`damage` or `healing`). `spell` is the spell a scroll or wand holds, by `ContentId`, and the `rank` it casts it
  at. Only ammunition has `ammunition`, the kinds it can be fired as (`arrows`, `bolts`), or a magazine's one
  kind; ammunition that names none fits any weapon that doesn't take a magazine.
- **Equipment.** `container` is its `capacity` in Bulk (no limit when absent), how much of what it holds is `ignored`
  however it is carried (a backpack's first 2), and its `heldBulk` when held or stowed differs from its `bulk` worn
  (a backpack is negligible worn, light carried).
  `apex` is the attribute an apex item raises.
- **Staves.** A staff is a weapon or an item with the `staff` trait and typed `staff` spells: a list of ranks, each
  `cantrip` or a spell rank 1 to 10, with the spells (`ContentId`s) the staff lists under it, each rank once. The
  charge cost of a spell is its rank, and a cantrip costs none; it is read from the rank, not stored
  (`staffCharges`). Magic staves are weapons in Foundry; a coda instrument is equipment. A staff with no `staff` is
  a staff whose list is not typed yet, listed by the coverage report.
- **Kits.** `items` are `ContentId`s with a `quantity`, and a container in a kit lists its `contents` the same
  way. A kit has no level or Bulk; a class kit carries its class's trait.

### Rich text

Descriptions are stored as a small, safe document AST, not HTML: `RichText` in `libs/rules/sdk` (`rich-text.ts`),
see [ADR-0019](../adr/0019-rich-text-ast-rendered-in-rules-ui.md). A document is an array of blocks:

| Block       | Fields                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `paragraph` | `content`: inline nodes                                                      |
| `heading`   | `level` 1 to 3, below the heading the text sits under; `content`             |
| `list`      | `ordered`; `items`, each a run of blocks, so items hold paragraphs and lists |
| `table`     | `caption?`, `header?` (one row of cells), `rows`; a cell is inline nodes     |
| `rule`      | a thematic break, as before a spell's heightened entries                     |

Inline nodes carry semantics so text stays live:

- `text`: a run of text, with `marks` `emphasis` and `strong`. Always text, never markup.
- `line-break`: a break inside a run, where the division is content (a stat line, a table cell).
- `ref`: a link to another content entry by `ContentId` ("[Off-Guard]", "[Seek]"), with an optional `label`; the
  name comes from the entry otherwise.
- `check`: a `statistic` selector, an optional `dc` (a number, or `{ against: <selector> }` for another
  statistic's DC such as a class DC), `basic` (saves only) and roll `options` ("DC 20 Athletics", "basic Reflex
  save").
- `damage`: `instances`, each a `formula` of dice and a formula (`2d6`, `1d8 + @attr.str`, `(@item.level)d6`) with an
  optional `damageType` and `persistent` or `splash` `category`; `healing` when it restores hit points ("2d6 fire
  and 1d6 persistent fire", "2d8 healing"). Everything but the dice is checked against the formula vocabulary.
- `template`: an area `shape` and `size` in feet, and a `width` for lines ("60-foot line, 10 feet wide").
- `duration`: a `count` of rounds, minutes, hours or days.
- `action-cost`: an action glyph (`one`, `two`, `three`, `free`, `reaction`), read out as its name.

Checks and damage become rollable with the dice work. A document may nest at most 24 levels of JSON and hold at most
5000 arrays and objects; anything bigger is rejected before the schema walks it.

`libs/rules/ui` renders it: `pio-rich-text` builds every node from frontier components and never sets HTML. Pages
give it names and links for references and statistics with `provideRichTextLinks`, and the outline level of its
headings with `headingLevel`. The rules playground's "Rich text" mode validates a document and previews it.

The importer converts Foundry's HTML and enrichers (`@UUID[...]`, `@Check[...]`, `@Damage[...]`, `@Template[...]`)
into this AST.

## Books and source references

Sources are first-class. `libs/rules/catalog/src/books.json` is the registry, validated on load by `BookRegistry`
(`Book` and `Books` schemas in `libs/rules/sdk`):

```ts
interface Book {
  id: BookId; // 'player-core', 'gm-core', 'monster-core'
  publisher: 'paizo';
  license: 'ORC' | 'Paizo-CUP' | 'homebrew'; // ContentLicense, shared with pack manifests
  remaster: boolean;
  released?: PlainDate;
  aonSourceUrl?: Url; // the book's AoN Sources page
}

// Titles are not stored: BOOK_TITLES maps each BookId to a message key, and the registry rejects a
// book without one (ADR-0024). Published books only: homebrew cites a `homebrew` source, and OGL
// joins ContentLicense when a legacy book is imported.

type SourceRef =
  | { kind: 'book'; book: BookId; page?: number; aon?: Url }
  | { kind: 'web'; url: Url; title?: string }
  | { kind: 'homebrew'; author: UserId; pack: PackId; url?: Url };
```

Validation: every entry needs at least one source. A `book` source may cite the book alone until its page and AoN
entry are known, as imported entries do before enrichment; the coverage report counts what is missing. AoN URLs must
be on `2e.aonprd.com` and point at an exact entry (`/Feats.aspx?ID=…`), not a search page.

Every view of content shows its sources with `pio-source-line` (`libs/rules/ui`), one line per entry, sources
joined in order:

- **Book**: the registry title, the page formatted for the locale, and an "AoN" link to the entry, named
  "AoN: Player Core page 123 on Archives of Nethys" for screen readers: "Player Core p. 123 · AoN". A book missing
  from the registry shows its id, flagged.
- **Web**: the title, or the URL's host without one, linked.
- **Homebrew**: the pack's name, linked when the source has a URL, and "by" its author.

It is presentational (ADR-0028): pack and author display names come in as inputs from the page that resolved them,
and a missing one falls back to the pack id or an unknown author. The rules playground shows it on a valid
"Content entry" and on each entry "Content filters" keeps; the content browser (#24) picks it up.

Checks that need the registry live in `libs/rules/catalog` (`sourceIssues`): a `book` source names a registered
book, and a `homebrew` source's `pack` is the entry's own pack. Each failure is a message descriptor naming the
entry, the source's index and the book or pack, at `sources[i].book` or `sources[i].pack`. The catalog runs them on
every pack it loads, so a wrongly sourced entry fails `bun run affected`; the rules playground's "Content entry" mode
runs them after the schema.

`bun run content:coverage` reports, per registered book, how many catalog entries cite it and which cite it by AoN
link alone, still waiting for a page, so pages can be filled in over time. It reports and never fails.

## Packs and storage

```text
content_packs        id, slug, title, publisher, owner_id (null = official), visibility, license, version,
                     content_hash, data jsonb, updated_at
content_entries      id, pack_id, kind, slug, name, level, rarity, traits text[], data jsonb,
                     search tsvector, updated_at
content_pack_deps    id, pack_id, depends_on        -- a homebrew pack extending another pack (ADR-0057)
```

There is no `content_books` table: the book registry is code, and a book's title is a message key (ADR-0024).
A pack's `id` is UUIDv5 of its slug (`contentPackId`), as an entry's is of `<pack>/<slug>`. Each `data` column holds
the whole `pack.json` or `ContentEntry`, so a row reads back as the file it came from; the other columns copy the
fields the content browser filters on (GIN index on `traits`, btree on `level` and `(pack_id, kind)`). `search`
waits for Epic 2.4.

- **Official packs** are imported once into `content/packs/<pack>/<kind>.json`, then edited by hand as normal PRs
  (diffable), and upserted on deploy by id. Errata is a hand edit and a diff (ADR-0031). `pioneer-api migrate` seeds them
  after applying migrations; `pioneer-api content-seed` (`bun run content:seed`) seeds alone (ADR-0029). Each pack
  is one transaction: the pack row and its entries are upserted, entries no longer in the pack are deleted, and a
  failure leaves the pack as it was. `content_hash` is SHA-256 of the pack's canonical JSON and the seed format; a
  pack whose hash is already stored is skipped without writing. Content is seeded before a new image takes
  traffic, so a content shape the serving image cannot read ships in two deploys, reader first.
- **The API reads content from these tables**, never from the JSON bundled into its image. `StoredContentSource`
  (`libs/rules/infrastructure`) builds one `ContentRegistry` per process from the official packs' rows, checked
  again as the files they hold and registered in slug order. Each use of content first reads the stored
  `content_hash` values, so a re-seed rebuilds the registry on the next request without a restart.
  `registry(packs)` adds the homebrew packs in force for a character (its campaign's, else its own that its owner may
  still read; ADR-0060) and the packs they extend, after the official ones and each after what it extends. One registry
  is kept per set of packs, under the stored hashes of all of them, up to 64 sets.
- **Homebrew packs** are created in the app and owned by a user. Visibility is private, campaign or public.
  `libs/homebrew` creates them: a new pack is an empty `pack.json` under the license `homebrew`, private, with a slug
  unique across every pack (official ones included, so a homebrew pack never takes an official pack's key). The
  actor's own packs are listed at `GET /homebrew/packs`; another user's pack is a 404.
- **Overriding official content** in homebrew is a new entry with `supersedes` pointing at the official one.
  The registry resolves supersession per character or campaign, so a GM can house-rule a feat without touching
  the official row.
- **Enabled packs** are chosen per campaign (and per character outside campaigns). The registry is built from
  exactly those packs. A GM enables a homebrew pack they may read, which enables the packs it extends too; official
  packs are always on (ADR-0058). A character outside campaigns enables its own in `character_packs`, the owner's
  private packs included; in a campaign it uses the campaign's and its own rows wait (ADR-0060).
- **Enabled variant rules** are chosen the same way: a GM per campaign in `campaign_variant_rules`, a character outside
  campaigns in `character_variant_rules`. A variant rule can be enabled only while a pack in force defines it, and is read
  against the packs in force, so one whose pack is off waits and comes back with it (ADR-0061).

Official content is JSON, not TypeScript: thousands of entries as TypeScript would slow typechecking for no benefit,
and homebrew cannot use that path. A pack directory holds:

- `pack.json`: the manifest (`id`, `title`, `publisher`, `license`) and pack-wide data no entry holds. The core
  rules pack keeps its proficiency bonus table (ADR-0026) and roll option namespace table here.
- `<kind>.json`: an array of `ContentEntry` envelopes of that kind, in a stable order.

The hand-authored packs (`core-rules`, and the `monster-core` entries transcribed before the importer exists) live
there too, beside the Foundry imports `player-core`, `player-core-2`, `gm-core`, `divine-mysteries`,
`treasure-vault`, `howl-of-the-wild`, `war-of-immortals`, `mwangi-expanse`, `secrets-of-magic`, `rage-of-elements`, `tian-xia-character-guide`,
`dark-archive-remastered`, `character-guide`, `impossible-lands` and `impossible-magic` (`mwangi-expanse`, `secrets-of-magic`, `rage-of-elements`, `character-guide` and `impossible-lands` are pre-remaster
and OGL, for content the remaster books point at, such as the Goloma ancestry; `OGL_BOOKS` in the importer lists the books it takes that way).
`libs/rules/catalog` loads them lazily and checks every entry against its
schema and the book registry, so a malformed or wrongly sourced entry fails `bun run affected`. Ids are stored on
characters, so changing an entry's slug, its kind included, is a data
migration; a catalog test pins every id that exists. The slug names its kind (ADR-0034), so only two entries of one
kind and name in a pack collide.

### Delivery to the browser

The engine runs client-side, so the browser needs content. Packs are served as immutable, content-hashed bundles
split by kind and by purpose, cached in IndexedDB, and loaded lazily (spells only when a caster needs them):

| Bundle                                               | Contents                                 | Loaded                         |
| ---------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| `player-core/feat.mech.<hash>.json`                  | ids, levels, traits, rule elements, data | when the engine needs the kind |
| `player-core/feat.names.<locale>.<hash>.json`        | names, short summaries                   | with the mechanics bundle      |
| `player-core/feat.desc.<locale>.<shard>.<hash>.json` | descriptions, sharded by id prefix       | when an entry is opened        |

Mechanics never depend on locale, so switching language downloads only text. Likely-next bundles are prefetched
when idle. Content browser search is server-side through per-locale `tsvector` and trait/level indexes.

- **Descriptions, by shard.** A kind's descriptions are many and long, so `<kind>.desc.<locale>.<shard>.<hash>.json`
  holds those of the entries whose id starts with one hex digit (`descriptionShard`), as an object from id to
  `RichText`. An entry with no description is in none, and a kind with none has no description bundles; the manifest
  lists each kind's shards (`KindBundles.descriptions`). Only the source locale `en` ships; per-locale shards and the
  `en` fallback when a translation is missing arrive with [#693](https://github.com/DavidDudson/pioneer/issues/693).
- **Built from the seeded rows.** `contentBundles` (`libs/rules/sdk`) makes, per official pack, `pack.<hash>.json`
  (its `pack.json`), and per kind `<kind>.mech.<hash>.json` (entries sorted by id, without `name` or `description`)
  and `<kind>.names.en.<hash>.json` (id to name). The hash is the first 16 hex digits of SHA-256 of the bundle's
  canonical JSON, so equal content gives equal names, and a changed name changes only that kind's names bundle.
  `StoredContentBundles` (`libs/rules/infrastructure`) builds them once per set of stored `content_hash` values,
  as `StoredContentSource` does its registry.
- **Served publicly** (ADR-0007): `GET /api/content/manifest` (`public, max-age=10`) lists each pack's bundle files
  by kind, and `GET /api/content/bundles/<pack>/<file>` (`public, max-age=31536000, immutable`) serves one. A file
  no current manifest names is a 404, which the edge Worker does not cache.
- **Kept in the browser.** `ContentBundleCache` (`libs/rules/data-access`) reads the manifest once a session,
  keeps every bundle in IndexedDB by path, and evicts the paths a new manifest no longer names. Offline, the last
  manifest read stands in, so every kind kept still loads. `ContentLoader` builds a `ContentRegistry` of every
  pack with only the kinds a page asks for, then prefetches the likely next kinds (ancestry, then heritage and
  languages, and so on through building a character) when idle. A bundle that fails to load (a re-seed since the
  session read the manifest makes it a 404) sends the loader back for a new manifest, once. An entry read from
  the registry has no description: `ContentLoader.description(entry)` fetches the entry's shard of the kind's
  description bundles and keeps it in IndexedDB like any bundle.
- **Homebrew packs, for signed-in members.** `POST /api/content/homebrew/manifest` takes the pack ids a page uses
  and answers with the manifest of those packs and the packs they extend; `GET /api/content/homebrew/bundles/<pack>/<file>`
  serves one bundle (`HomebrewContentContract`, `libs/rules/sdk`). `HomebrewBundleService` (`libs/homebrew/application`)
  keeps to the packs the user may read: a pack they may not read is left out of the manifest and its bundle is a 404,
  the same as a missing one. `StoredPackBundles` and `PackSetCache` (`libs/rules/infrastructure`) build the bundles once
  per set of stored `content_hash` values. Responses are `private`, so the edge Worker, which keeps only `public`
  ones, never caches them. `ContentLoader.registry(kinds, homebrew)` adds those packs to the official ones. They are
  kept in memory for the session, never in IndexedDB, since they are the signed-in user's and change when they edit a
  pack. The sheet asks for the packs its character uses (the campaign's, else its own, ADR-0060), so it waits for that
  list before the registry builds.

## Filters

The content browser, the builder's slot pickers, spell preparation and the shop share one filter system. Each
kind declares its **facets** as data: a field path in the envelope or `data`, a type (`set`, `range` or `flag`)
and a message key, so adding a facet is a definition, not a UI change.

Facets beyond level, rarity, traits, book and pack:

- **`spell`**: rank; tradition; cast actions; range band; area shape; target count and kind (single target,
  allies, self); defence (attack, save and which); duration; sustained; damage type; heightens.
- **`feat`**: category; action cost; archetype; skill; prerequisites met (with the **Available to you** preset).
- **Equipment**: item kind; price; bulk; usage (held, worn, etched, affixed); consumable; magical; weapon group and
  damage type; armour category.
- **`action`**: cost; mode; skill; trait (the common traits facet).

Behaviour:

- Facets filter the cached mechanics bundles in the browser, so filtering is instant and works offline. Free-text
  search still goes to the server.
- Within one facet values combine with OR, across facets with AND. Any value can be excluded ("not fire"). Every
  value shows how many entries it would leave.
- The filter state lives in the URL, so a filtered list can be linked and survives a reload. Each facet that
  narrows the list is one param, `f.<facet id>`: values joined by commas with `!` marking an exclusion
  (`f.traits=fire,!evil`), or a range as `min..max` with either end left out (`f.level=..5`). Params that don't
  read are dropped, never an error, so an old link still opens.
- An entry whose field is missing (no level) counts under **Unknown** rather than vanishing from every
  selection. A `set` or `flag` facet can pick or exclude Unknown like any value; a `range` drops unknown entries
  once a bound is set. A value's count is how many entries picking only that value would leave.
- The content browser (`/content`, `libs/content/feature`) keeps the kinds it lists in the URL too, `kind=feat,spell`,
  and shows each kind's facets: a facet that reads only some of the kinds listed (weapon group) is left out unless the
  list holds one of them. Its table and filter panel (`pio-facet-filter`) are built from the facet definitions, so a new
  definition shows up without a template change.
- The engine (`libs/rules/sdk`: `facet.ts`, `facet-filter.ts`, `filter-query.ts`) is pure and runs on parsed
  entries; the rules playground's "Content filters" tool exercises it.
- A facet reads a field path or derives its values from the entry. Spell facets derive (`spell-facet-values.ts`):
  range falls into bands (touch, up to 30, 60 and 120 feet, longer, miles counting as longer, planetary,
  interplanar, unlimited, none), and a choice of ranges or durations gives each option's value; a variable
  casting time gives every action count it spans; targets are single, multiple, allies and self (the caster);
  defence is attack (the `attack` trait or against AC) or the save; duration is its largest unit, rolled ones
  included, with a week or more as long, and `varies` as its own value. Absence is a value (no range, no area,
  instant), not unknown. Entries of other kinds give a kind's facets no value, so picking one keeps only that kind.
- Feats and actions share the action cost and skill facets, so a mixed list filters both alike. Action cost is a
  glyph, `variable` (any `upTo`) or `passive` (no cost, or a feat without an `action`). Skill reads `skills` (a
  feat's and its action's); every Lore is one `lore`. With none named, a skill feat or an entry with the `skill`
  trait is unknown and any other is `none`. Archetype is the feat's `archetype`, unknown for an `archetype`-trait
  feat without one; other feats give no value. Mode is `exploration` or `downtime` from those traits, else
  `encounter` (`action-facet-values.ts`; [ADR-0025](../adr/0025-feat-and-action-facet-fields.md)).
- Every equipment kind (weapon, armour, shield, equipment, consumable, rune, treasure, kit) shares one facet
  set, so a mixed list filters alike (`equipment-facet-values.ts`). Price is a range in copper over the printed
  price, a batch's ("1 sp for 10") included; no price is unknown. Bulk is a range in tenths, so negligible is 0,
  light 1 and 1 Bulk 10; the facet's `scale` (10) tells a UI to show it in Bulk, and a kit's Bulk is unknown.
  `scale` is for display only: URL bounds stay in the stored unit, so `f.bulk=..10` is up to 1 Bulk and
  `f.price=..100` up to 1 gp.
  Usage is armour worn, a shield held and a rune etched, else the item's usage (unknown when left out); treasure
  and kits give none. Magical is the `magical` trait or a tradition trait in its place; consumable is the
  `consumable` kind or trait (an alchemical bomb is a weapon). Damage type is one facet shared with spells, a
  weapon's persistent damage included and a weapon that deals no damage (a glue bomb) giving only that
  ([ADR-0027](../adr/0027-equipment-facet-units.md)).
- A facet that reads only some of the kinds it is listed for names them in `appliesTo` (weapon group: weapons;
  armour category: armour; damage type: spells and weapons), so a UI can hide it when the list holds none.
- **Available to you** is a preset made from the character: level at most the character's (or the slot's level
  for a feat slot), the class and ancestry traits the slot asks for, the traditions of the character's
  spellcasting entries, prerequisites not false, unique entries and the `artifact` trait hidden. Unknown
  prerequisites stay in the list with a marker. The preset is a starting point: every facet in it can be changed.

## Localisation

Names, descriptions, summaries and rule element labels are translatable; mechanics are not. Text lives in
`content_entry_texts (entry_id, locale, field, text)` (one row per locale and field, unique together, with its own
`id` for the audit log), with `en` as the source and per-field fallback, marked in the UI when a fallback is shown.
The seed writes each official entry's `description` as an `en` row beside its `data`, and removes the row when the
entry loses its description; it never touches another locale's rows. Description bundles are built from the pack's
entries until translations exist. Homebrew authors can add translations for their packs. Community Foundry
translation modules (Babele-based) can be imported as text-only packs keyed by Foundry id. See
[ADR-0009](../adr/0009-i18n-and-lazy-loading.md).

## Foundry import

`tools/content-import` bootstraps official packs from [foundryvtt/pf2e](https://github.com/foundryvtt/pf2e) at a
pinned release. Their entries already carry rule elements, predicates, traits and
`publication { title, license, remaster }`. The import is a one-off per pack (ADR-0031): once a pack's import PR
merges, the committed JSON is the source of truth, and enrichment, corrections and errata are edits to it.

```mermaid
flowchart LR
  F[Foundry pf2e packs<br/>pinned tag] --> S[Select<br/>remaster, target books]
  S --> T[Translate<br/>schema + rule elements]
  T --> L[Resolve i18n labels<br/>lang/*en.json]
  L --> R[HTML + enrichers<br/>to RichText]
  R --> V[Validate<br/>zod, refs resolve]
  V --> O[content/packs JSON<br/>+ content/import backlog]
  O -. once, then by hand .-> E[Enrich and correct<br/>page, AoN URL, errata]
```

- **One-off.** The importer writes a pack that does not exist yet, or replaces one as a whole before its import
  PR merges. It never merges into a pack that has been edited by hand, and no CI job re-runs it.
- **Selection.** Only `publication.remaster === true`, ORC-licensed entries from the target books. Legacy content
  is out of scope. Foundry updated remastered entries in place and marks no replacements (none at `pf2e-8.6.0`), so
  imported entries carry no `supersedes`; it stays for homebrew overrides and enrichment. Target books are a CLI
  argument; Foundry's publication title maps to a registered book in `libs/interop/foundry`. Only item packs and
  journals are read, and only item types with a Pioneer kind (`campaignFeature`, for one, has none); journals only
  for the archetypes Foundry keeps as pages.
  `just content-import --pack player-core --book player-core --dry-run` prints what would be imported by Foundry
  type and book, what is skipped and why, what did not translate, what pack output leaves out, and the coverage
  table; without `--dry-run` it also writes the pack (Pack output, below).
- **Translation.** One translator per Foundry rule element key. Untranslatable elements, unresolved labels and
  links, and fields with no place in a schema go to the pack's backlog, `content/import/<pack>.json`, with the
  entry and Foundry's raw JSON; the entry is imported without them. The backlog is committed with the pack and is
  the work list for engine and translator stories.
- **Applying a translator to a committed pack.** Re-running the import would replace a pack's later corrections, so
  once a translator covers more rule elements, `just content-import --pack <pack> --book <book> --apply-rules
FlatModifier` appends the import's rules of the keys named to the committed entries the backlog lists with a gap of
  one of them, and clears those gaps from the backlog. Rules of other keys, and entries with no such gap, stay.
- **Modifiers and predicates.** A `FlatModifier`'s `selector` becomes `selectors`: a skill or save by its statistic
  (`diplomacy` is `skill:diplomacy`, `reflex` is `save:reflex`), any other (`saving-throw`, `ac`, `melee-damage`) as it
  is. An omitted `type` is `untyped`, and `hideIfDisabled` is dropped. A roll option Foundry writes bare (`poison`,
  `devils-bargain`) gets the `option:` namespace in every element's predicate, as Pioneer's roll options need one;
  `option` is not a known namespace, so such a statement reads as situational. An `AdjustModifier`'s `selector` is
  read the same way. `removeAfterRoll`, `requiresEquipped`, `relabel`, `maxApplications`, a
  damage category and a selector built from the item (`{item|id}-damage`) have no Pioneer meaning yet and stay in the
  backlog.
- **Roll options.** A `RollOption`'s `option` gets the same `option:` namespace when bare, its `domain` is read as a
  selector (`performance` is `skill:performance`), its `label` is the toggle's `display.label`, and a suboption
  labelled `{item|name}` takes its item's name. `alwaysActive`, `placement` and `phase` only steer Foundry's sheet
  and are dropped. `mergeable` (suboptions pooled across items into one choice), `disabledIf`, a `toggleable` that is
  not a flag (`totm`), `count`, `requiresEquipped` and an option read from an actor flag have no Pioneer meaning yet
  and stay in the backlog.
- **Choice sets.** A `ChoiceSet`'s camel-case `flag` becomes a slug (`fighterSkill` is `fighter-skill`), and one with no
  flag takes the slug of its item, as Foundry does. A choice's numeric value is text, its predicate reads bare roll
  options as above, and its icon and the set's `adjustName` are dropped. `choices` as a list, a query by `itemType`
  (`feat`, `action`, `spell`, `weapon`, `shield`, `heritage`, `ancestry`) with a `filter`, and the `skills` config
  are translated; a `rollOption` may be a namespace of its own (`kinetic-gate:initial`). A pick that has no
  `rollOption` and that no translated element reads (a skill chosen for a rank raise whose rule is still in the
  backlog) stays in the backlog with the rules that would read it, as it would ask the player for nothing. A choice
  with an object value, an unlabelled pick of an item, another config (`damageTypes`), a query of the deity (the root
  slot replaces it), `slugsAsValues`, `allowedDrops`, `actorFlag` and `slug` stay in the backlog. A pack's rules for
  the pick (`Proficiency`, `GrantItem`) are taken with it, as in
  `--apply-rules ChoiceSet,Proficiency,ActiveEffectLike,GrantItem`.
- **Defences.** A `Resistance`, `Weakness` or `Immunity` takes its `type` as a list, with Foundry's `all-damage` as the
  `all` group; a formula `value`, `exceptions` and a predicate are read as for any element. A type picked by a
  `ChoiceSet` (`{item|flags...}`), a `custom` type with its own `definition`, a type that is a damage trait rather
  than a damage type (`holy`, `unholy`, `silver`, `area-damage`), `doubleVs`, `mode`, a value read from the actor's
  flags and the `exceptions` of an `Immunity` have no Pioneer meaning yet and stay in the backlog.
- **Item alterations.** An `ItemAlteration` reaches the items its `itemType` (`item:type:spell`) and the statements of
  its predicate that read only the item (`item:slug:...`, `item:equipped`) pick out, as `items`; the rest of the
  predicate stays the element's. Only the `traits`, `hardness` and `ac-bonus` properties with a literal value are
  translated. An alteration of the item that holds it (`itemId`), the other properties (`description`, `other-tags`,
  `area-size`, `runes-*`, `name`, `bulk` and the like) and a value read from the actor or a pick stay in the backlog.
- **Damage dice.** A `DamageDice` takes its `selector` as `selectors` and a formula `diceNumber` in Pioneer's
  reference spelling, and drops `hideIfDisabled`; `diceNumber`, `dieSize`, `damageType`, `category`
  (`persistent`, `precision`, `splash`), `critical`, `override` (of the damage type), `slug` and a predicate are read as
  Foundry writes them. A `DamageAlteration` of `dice-number` or `damage-type` needs no change. A selector built from
  the item (`{item|id}-damage`), a type or dice read from a pick or the item, and a formula Pioneer cannot read stay in
  the backlog.
- **Notes.** A `Note` takes its `selector` as `selectors`; its `text` becomes rich text as a description does (plain
  text as a paragraph, `@Localize` inlined), and a title of `{item|name}` is the item's name. `outcome` and a predicate
  stand. A title or text read from the item (`{item|description}`), a selector built from the item (`{item|_id}-damage`)
  and text with unresolved lang keys stay in the backlog.
- **Base speeds.** A `BaseSpeed` becomes a `Change` that upgrades `speed:<type>` for `land`, `burrow`, `climb`, `fly`
  or `swim`: it raises a speed to its value and never lowers one. `value` and a predicate stand. A selector built from a
  pick (`{item|flags.system.rulesSelections.speed}`) and a value read from the actor's land Speed
  (`@actor.system.movement.speeds.land.value`, which is the Speed after modifiers, not the base `@stat.speed.land`)
  stay in the backlog.
- **Healing.** `FastHealing` and `TempHP` carry over with their `value` (a number, or a formula of the item or the actor
  level), a predicate, and for `FastHealing` its `type` (fast healing or regeneration) and `deactivatedBy` damage types.
  A value read from the origin item (`@item.origin.level`), from a pick (`@item.flags.system.rulesSelections.rank`) or
  from another actor's attribute stays in the backlog, as does Foundry's `TempHP` `expiration`, which no content in the
  packs sets.
- **Strikes.** A `Strike` of an attack of its own drops `baseType`, `otherTags` and `img`, reads `range: null` as no
  range and `{ increment }` as the range increment, and is named by its `slug`, else its base type, else its label.
  Its damage is read as before; a dice count that is a formula, and one with no name to be had (a torch), stay in the
  backlog. An `AdjustStrike`'s `definition` (the weapons it reaches, by their roll options: `item:ranged`,
  `item:slug:longsword`) becomes `strikes`; `traits`, `materials`, `property-runes` and `range-increment` are
  translated. One aimed at a roll domain (`selectors`), and any whose `definition` or `value` is read from a pick or the
  item (`item:id:{item|_id}`, `{item|flags...}`), stay in the backlog. Pioneer's engine reads `Strike` elements;
  `AdjustStrike` lands typed and is applied to Strikes by a later story. `ItemAlteration` is applied
  (rules-engine.md, "Item alterations").
- **Size and traits.** A `CreatureSize` takes its `value` and `maximumSize` as Pioneer names a size (`sm` is `small`,
  `med` `medium`, `lg` `large`, `grg` `gargantuan`) or, as a number, as steps from the current size; `resizeEquipment` and
  `reach` (`override` or `add`) stand. A size or reach read from a pick stays in the backlog. An `ActorTraits` needs no
  change; one whose predicate compares with the item level (`{item|level}`) stays in the backlog.
- **Check shaping.** An `AdjustDegreeOfSuccess` (`adjustment` per degree or `all`, each `one-degree-better`,
  `to-success` and so on; `type` becomes `checkType`), a `RollTwice` (`keep` `higher` or `lower`) and a `SubstituteRoll`
  (`slug`, `value`, `label` as `display.label`) read their `selector` as `selectors`, as a modifier does. A
  `removeAfterRoll: false` is Foundry's default and is dropped; `true` (an effect spent by its roll) stays in the
  backlog, as does a `SubstituteRoll` whose skill is read from a `ChoiceSet` pick (Assurance).
- **Grants and auras.** A `GrantItem` takes Foundry's `preselectChoices` as `choices`, by the flag of the granted entry's
  `ChoiceSet` in Pioneer's spelling, and drops `nestUnderGranter` and `reevaluateOnUpdate`, as a Pioneer grant is derived
  and follows its predicate. An `Aura` takes its `radius` (feet or a formula; `@item.badge.value` is `@item.value`), its
  `traits` and its `slug`, and each effect's `uuid` as the entry `effect` it resolves to, with `affects`, `includesSelf`
  and `events`. An effect that does not resolve, a predicate that reads the effect's origin (`{item|origin.signature}`)
  or its level, and Foundry's `level` and `value` on an aura stay in the backlog.
- **Dropped on purpose.** `TokenLight`, `TokenEffectIcon` and `TokenMark` only change a Foundry token (its light, the
  icon of an effect on it, a mark), and Pioneer has no token. The import drops them with the reason `token-only` and
  prints them apart from the untranslated rule elements; they are not in the backlog, so an entry whose only gap
  was one counts as having its rules translated. A light's bright and dim radii stay in the item's text and in the
  pinned release, for the light levels of
  [#685 feat(content): light levels and terrain contexts](https://github.com/DavidDudson/pioneer/issues/685).
  `--apply-rules` also clears a gap the import no longer reports, as for these, in an entry that gains no rule.
- **References across packs.** A compendium UUID naming a document an earlier import brought in resolves to that
  import's entry, found by the document's UUID in the entry's `externalIds.foundry`, never by name or slug: a Divine
  Mysteries deity's Player Core spells. A reference to a book not imported yet
  goes to the backlog as an unresolved reference.
- **Labels.** Foundry writes much of its text as lang keys (`PF2E.SpecificRule.Prompt.Skill`). They resolve against
  Foundry's English lang tables, every `en` file `system.pf2e.json` lists (`en.json`, `action-en.json`,
  `re-en.json`, `kingmaker-en.json`), merged in that order as Foundry loads them, a later string winning and dotted
  keys nested. Any string in a rule element that is wholly a key is resolved before the element is translated:
  ChoiceSet prompts and choice labels, RollOption suboption labels, and Foundry's base `label`, which becomes
  `display.label`. `@Localize[key]` in a description is replaced by the key's text before the HTML is read, as
  Foundry inlines it, enrichers and all. Foundry fills `{item}` with the document's name, and so does the import;
  `{actor}`, `{origin}` and a key built from an injected property (`{actor|class.slug}`) are only known at play. A
  key with no English text, or only play can fill, is reported by reason and key and its text left out (a
  `@Localize` keeps its label), never written as the key; an element that needs that text, such as a choice
  without its label, goes to the backlog as it was. The backlog keeps Foundry's raw JSON, keys included.
- **Descriptions.** Foundry's HTML becomes rich text (`htmlToRichText`): paragraphs, headings (`h4` and deeper
  clamped to level 3), lists, tables (a `thead` row, or a first row of only `th`, is the header), rules, line
  breaks, and `strong`/`b` and `em`/`i` marks. Whitespace collapses as a browser would. Any other element
  (`span`, `section`) and every attribute is reported by name, and its text kept without the markup; content a
  table has no place for follows the table. `script`, `style` and similar are reported and dropped with their
  content. A description too big or deep for `RichText`'s bounds is flattened to plain paragraphs and reported. The
  parser is htmlparser2, not jsdom, so `libs/interop/foundry` stays `platform:any`. Action glyph spans
  (`<span class="action-glyph">2</span>`) become `ActionCost` nodes.
- **Enrichers.** Foundry's inline enrichers in description text become inline nodes, in a second pass once every
  selected document has its entry id, so links between entries resolve in either order:
  - `@UUID[Compendium.pf2e.<pack>.Item.<id or name>]{label}` and the action macro `[[/act <slug>]]` are a `Ref` to
    the imported entry, with the label unless it only repeats the target's name. A target outside the import is its
    label, else Foundry's name for it, as text.
  - `@Check` is a `Check`. Statistics become selectors: saves `save:<save>`, skills `skill:<skill>`, Lores
    `skill:lore:<topic>`, `perception`, and `flat` for a flat check. `against:` (or `defense:`) names a DC: `class`
    and each class slug `class-dc`, `spell` `spell-dc`, `class-spell` `class-or-spell-dc` (Foundry's higher of the
    two), `ac` and `armor` `ac`, otherwise the statistic's selector. That DC belongs to whoever does not roll
    (`rollerRole`, by default the target for a save and the origin otherwise), and a `Check`'s DC is the reader's
    own, so it is kept only when the target rolls; a check the reader rolls against a target's DC is reported. A
    whole-number `dc` plus any `adjustment`, `basic` on a save, namespaced `options` and the label carry over.
  - `@Damage` and typed inline rolls (`[[/r 2d6[fire]]]`) are `Damage`: one instance per comma-separated part, its
    `[type,category]` flavour read into a damage type, `persistent` or `splash` (also an inner `[splash]` around
    the whole formula, `(1[splash])`; one around part of it does not translate), with `healing` and `untyped`
    understood. Formula references translate through `fromFoundryPath`.
  - `@Template` is a `Template`; Foundry's label is dropped, since the node renders the area in the reader's units.
  - An inline roll of a whole number of rounds, minutes, hours or days is a `Duration`. Any other roll reads as its
    label, else its formula, since rich text has no roll node; one whose formula reads the actor or item is reported.
  - What has no place in a node (`traits`, unnamespaced `options`, an untranslatable reference or damage type, a
    shape Pioneer lacks, `@Embed`) is reported by enricher and parameter (`@Check[traits]`, `@UUID[spell-effects]`).
    An enricher that does not translate keeps its label as text, else what Foundry would show: the target's name,
    the statistic's words, the area (`20-foot burst`) or the formula. Only `@Embed` without a label is dropped.
    `@Localize` is inlined before this pass (Labels, above). Parameters that only change how Foundry shows a roll
    (`showDC`, `name`, `immutable`, `targetOwner`, `shortLabel`) are ignored.
- **Kind data.** Every Foundry type is filed under a kind (`FOUNDRY_TYPE_KINDS`), a feat of category `classfeature`
  under `class-feature`, one of category `ancestryfeature` under `ancestry-feature`, a spell with `ritual` data under
  `ritual` and equipment with an `etched-onto-…` usage under `rune` (`documentKind`); kind data is built for the kinds
  with a translator (`TRANSLATORS`): the rules core kinds `action` and `condition`, and the build, magic, effect and
  equipment kinds below. An action's cost comes from `actionType` and `actions`, its frequency period from Foundry's
  words or ISO 8601 durations (`PT1H` is `hour`), and its `trigger` and `requirementsText` from the description's labelled
  paragraphs, translated as descriptions are so their links and inline checks stay. A condition's `implies` is its
  unpredicated `GrantItem`s of conditions, so it lists exactly what its rules grant; its duration, active and removable
  flags are instance state and Foundry's back links are derived, so neither is carried. A set `system` field with no
  place in the schema, a value with no mapping, a spell's cost or requirements with links or enrichers, a reference to
  nothing selected, and data the kind's schema rejects are reported against the entry, never guessed.
- **Build kind data.** Fields Foundry and Pioneer spell alike carry over and the schema checks them; the rest map:
  - An ancestry's sizes (`med` is `medium`), boosts and flaws (Foundry's numbered slots, in order), and its
    languages and vision as `language` and `sense` entries by slug (`normal` vision is none). Its `items` (ancestry
    features) are `GrantItem`s, and it opens its ancestry feat slots (`ancestry-feat-<level>`, feats with its trait)
    on Player Core's schedule. `hands` is reported unless it is two. A heritage's ancestry resolves by UUID among
    the selected documents, else by slug among the other packs'; a versatile heritage has none.
  - A background's boosts; its `trainedSkills` become `Proficiency` elements (`Scribing Lore` is
    `skill:lore:scribing`, its statistic a vocabulary entry) and its `items` (the skill feat) `GrantItem`s.
  - A class's `keyAbility`, `hp` and `trainedSkills.additional`, and its progression as rule elements: a
    `Proficiency` per starting rank above untrained (perception, saves, attack and defence categories, skills, and
    `class-dc` trained, which Foundry gives every class), a `GrantItem` per class feature from its level, and feat
    slots: at each level of `classFeatLevels`, `generalFeatLevels` and `skillFeatLevels` (Player Core's when
    Foundry gives none) a `ChoiceSet` flagged `<class|general|skill>-feat-<level>` querying feats with the class's
    trait, `general` or `skill` up to the character's level, with the `GrantItem` of its pick. Later ranks come
    from the class features that raise them, as in Foundry. The one Player Core classes grant that is not Player
    Core's, Perception Expertise (Rage of Elements, no rules of its own), is a `Proficiency` raising `perception` to
    expert from the level the class grants it. Ancestry feat slots are the ancestry's, so a class
    whose `ancestryFeatLevels` depart from Player Core's is reported. A class's `skillIncreaseLevels` is kept as data
    (Player Core's when Foundry gives none); attribute boosts are the character's own slots. `spellcasting` is the
    starting rank of the character's one spellcasting rank (ADR-0040). `attacks.other` (a named weapon group) is
    reported. Player Core's classes name their `subclass` tag, which Foundry marks nowhere.
  - A feat's `category`, `prerequisites` as one paragraph of their text, `onlyLevel1`, `maxTakable` (Foundry's
    explicit `null` is `unlimited`, absent once), and `action` when it is used as one, read as an `action` item is
    with `actionCategory` as its category; action data its schema rejects (a reaction with no trigger) is
    reported and left off, the feat kept. A class feature has `action`, its `otherTags` as `tags` and its
    `subfeatures.keyOptions` as `keyAttributeOptions`; a subclass
    `ChoiceSet` (a filter of `item:tag:` terms alone, with a `GrantItem` of `{item|flags.system.rulesSelections.<flag>}`)
    becomes a class-feature query and a grant of its pick, its camel-case flag a slug.
    An ancestry feature (`ancestryfeature`) has `action`, as a class feature does; feature categories with no kind
    (`calling` and the rest) are reported and have no data; a feat's, class feature's or ancestry feature's
    `subfeatures.senses` become `Sense` elements, as a `Sense` rule does (below), and its
    `subfeatures.languages` a `Language` element, as does an `ActiveEffectLike` adding a whole number to
    `system.build.languages.max` (one adding a formula stays in the backlog), with no `access`, so common until set by
    hand. Its `subfeatures.proficiencies` become a `Proficiency` per key, with the class's selectors (armour
    categories `defense:<category>`, weapon categories `attack:<category>`, saves `save:<save>`, `perception`,
    `spellcasting`) and rank 1 to 4 as trained to legendary; a class's slug is `class-dc`, and the attribute a
    dedication's class DC uses instead of the key attribute (Rogue Dedication's `dex`) is reported, since there is one
    class DC. A key naming no statistic or imported class is reported. An `ActiveEffectLike` upgrading
    `system.skills.<skill>.rank` of one of the sixteen skills to a fixed rank is a `Proficiency` on `skill:<skill>`,
    predicate kept, or on the skill a `ChoiceSet` on the same item stored when the path is
    `system.skills.{item|flags.system.rulesSelections.<flag>}.rank`
    ([ADR-0053](../adr/0053-proficiency-selector-follows-a-choice.md)); a Lore, a formula value (a Lore feat's
    level-scaled override) or an override stays in the backlog. The same upgrade of
    `system.proficiencies.attacks.<category>.rank` (`unarmed`, `simple`, `martial`, `advanced`),
    `system.proficiencies.defenses.<category>.rank` (`unarmored`, `light`, `medium`, `heavy`) and
    `system.proficiencies.spellcasting.rank` is a `Proficiency` on `attack:<category>`, `defense:<category>` or
    `spellcasting`; a base weapon (`weapon-base-club`), a pick, a formula rank and a `self:level` predicate stay in
    the backlog. An `ActiveEffectLike` adding to or upgrading a number Pioneer derives is a `Change` on that
    statistic, predicate
    kept and Foundry's `phase` dropped: `system.attributes.reach.base` is `reach` (Bendy Arm Mutagen) and
    `system.attributes.dying.max` is `dying-max` (Mortalis Coin). A boolean (`system.attributes.flanking.flankable`)
    or a formula value stays in the backlog, as does a path with no statistic yet (`system.attributes.hp.recoveryAddend`,
    `system.attributes.shield.*`, `inventory.bulk.*`). A path under `flags.system.` only feeds another rule element's
    Foundry-side formula or predicate (`rageTempHP`, `cloisterRobeResistance`, `ancestralGeometry`,
    `spellheart.tomeOfRestorativeCleansing`), which Pioneer writes as a typed element instead, so these are dropped by
    design once that element exists and stay in the backlog until then. Its other `subfeatures`
    (`suppressedFeatures`, and key attribute options on any but a class feature) are reported by name
    (`subfeatures.suppressedFeatures`).
  - Player Core's casters get their spellcasting entries and rank raises by entry slug, since Foundry records neither
    ([ADR-0040](../adr/0040-spellcasting-entries-are-rule-elements.md)): a `SpellcastingEntry` on the bard, cleric,
    druid and wizard spellcasting features, each witch patron (in its tradition) and the bard, cleric, druid and
    wizard dedications; `Proficiency` raises keyed to the Spellcaster features, a cleric's doctrine and level, and the
    archetypes' Expert and Master Spellcasting feats. A witch dedication's tradition is its patron's, which Foundry
    leaves to the player, so it is reported.
  - Their spell slots too, which Foundry keeps nowhere
    ([ADR-0041](../adr/0041-spell-slots-are-rule-elements.md)): `SpellSlots` elements for Player Core's shared
    spells-per-day table on each caster's spellcasting feature, Divine Font's pool, the curriculum pool of every
    school but Unified Magical Theory, the dedications' cantrips and the archetypes' Basic, Expert and Master
    Spellcasting slots. What the pools take is `PoolSpells`
    ([ADR-0045](../adr/0045-pool-spells-are-rule-elements.md)): heal or harm by the font Divine Font's `ChoiceSet`
    picks (translated with both fonts offered, since the deity predicates would hide them), and each school's
    curriculum by slug.
  - Signature Spells gets a `SignatureSpells` naming the bard's entry, Player Core's only spontaneous class
    ([ADR-0047](../adr/0047-signature-spells-are-rule-elements.md)); Player Core 2's oracle and sorcerer add theirs, and later books add their classes' entries.
  - Player Core 2's sorcerer and oracle get a spontaneous entry and the same slot table with a slot more of each rank, and
    their bloodlines and mysteries a `RepertoireSpells` of the sorcerous gifts and granted spells
    ([ADR-0062](../adr/0062-repertoire-spells-are-a-rule-element.md)): the bloodline gives the sorcerer's tradition, a
    draconic exemplar and an elemental influence are a `ChoiceSet` whose pick gates the entry and the gifts it adds.
  - Player Core's focus spells get a focus entry and `FocusSpells` per feature or feat that grants them, from their text
    ([ADR-0050](../adr/0050-focus-spells-are-rule-elements.md)); a choice of focus spells (Domain Initiate's domain,
    a warden spell, Hex Spells' hex) is a `ChoiceSet` with a `FocusSpells` per option. Domains' spells come from the
    domains journal.
  - A deity's singular fields (`attribute`, `skill`) map to `attributes` and `skills:` selectors, and its spells,
    keyed by rank, to one `spell` entry each.
  - A kit's items by UUID with their quantities, a container's one level deep (deeper is reported), and its price
    with the coins it charges.
- **Magic and effect kind data.** Foundry writes a spell's casting time, range, targets and duration as English;
  each maps when its whole wording does, and otherwise is reported and left out (ADR-0021). A casting time that does
  not map leaves the spell without data.
  - Casting times are glyph counts (`2`), `reaction`, `free`, a choice (`1 to 3`, `1 or 2`) or a count of rounds
    to years. Ranges are feet, miles (`1 mile`, `half a mile`), `touch`, `planetary`, `interplanar`, `unlimited`
    or a choice of them joined by `or`; `varies` and `see text` (variants, #545) are reported. Targets are
    counts (`up to`, `one`, `1 to 3` and `1 or 2` as up to, `any number of` and `1 or more` as `any`, `all … in
range` and `… in the area` as `all`, `the triggering`) of creatures, objects, allies, enemies, corpses,
    weapons, items, spell effects and the caster's companions (`your animal companion`, `your familiar`), with the
    qualifiers `willing`, `living`, `dead`, `dying`, `sleeping`, `falling`, `flying`, `corporeal`, `unattended` and
    `magic`, alternatives joined by `or` (a later one without a count takes the first's), creature types and
    planar traits as a creature with the trait (`1 animal`, `1 extraplanar creature`), `you and …` and `you or …`
    as `you`, and `… and …` as `plus`. Wordings with a condition the schema can't hold (`1 creature you know by
name`, `of 13th level or lower`) and `1 or 10` (two counts, not a range) are reported. Durations
    are a count of a unit (sustained up to it when Foundry's `sustained` is set), `up to` one, rolled dice of a
    unit, `sustained` alone, `unlimited`, one of the `until` wordings, `varies` for `varies`, `see text`, `see
below` and `1 or more rounds`, or a choice of those joined by `or` (`sustained up to` marking a sustained side).
    Wordings with a condition (`until used`, `until full tribute is paid`) are reported. An area is Foundry's `type`
    and `value`, with its `details` as plain rich text unless they only restate the area (`20-foot-radius
burst`, `15-foot emanation centered on you`); a shape Pioneer lacks is reported.
  - A spell's `save` becomes a `save:` selector, and its `passive` defence `against` (`ac`, or `<save>-dc` as the
    save's selector). Traditions are `traits.traditions`. Damage parts keep Foundry's record key, lower-cased to a
    slug; an `untyped` part has no damage type, `applyMod` adds `@spellcasting.attr` to the formula and `materials`
    carry over. Foundry also writes `untyped` for a type the caster chooses, with an overlay setting each choice
    (Gouging Claw); such a part stays untyped and each variant sets its type, while one with a type Pioneer lacks is
    reported and left out, with what heightening adds to it. Draconic Barrage chooses its type with no overlay and is
    left out by hand.
    Interval heightening carries over (an area step of 0 is none); fixed heightening maps each rank's casting time,
    traits, range, area, target, duration and damage (laid over the spell's part of the same key), and reports anything
    else it changes. `overlays` become `variants`, in Foundry's `sort` order: an `override` overlay maps its time, range,
    area, target, duration, defence, damage (laid over the spell's parts by key) and heightening (laid over the
    spell's), and reports the rest (`traits`, `rules`), a defence, range or target it removes (a variant can't), and an
    overlay of any other type. An overlay that sets nothing Pioneer maps is left out. `cost` and `requirements` are
    rich text when they are plain words.
  - A ritual's casting fields map as a spell's. Its primary check is the skills Foundry lists (a Lore by topic,
    `Legal Lore` is `skill:lore:legal`; `Lore (any)` is `skill:lore`, `Lore (related to …)` adds `loreRelatedTo`) at
    the rank they name, or at a rank each when they differ; a leading `DC 30` is its `dc` and `as determined by the
tradition of spell cast in the ritual` its `pick`. Its secondary checks are separated by `;` where Foundry uses
    one, else by commas, each a choice of skills joined by `or`; a note `(whichever is used for the primary check)` or
    `(whichever isn't used …)` is the check's `pick`, and keeps a comma list before it as one check. Any other note
    (`you must be a demon`) is reported and leaves the ritual without data.
  - An effect's `category` is its pack's (`spell-effects` is `spell`, likewise `feat`, `equipment` and `other`;
    `campaign-effects`, the GM's, is `other` rather than a category of its own); one from any other pack is reported.
    Its duration is a count of rounds to days with Foundry's `expiry` and `sustained`, a `turn` for a count of none
    that expires at a turn's start or end, `encounter` or `unlimited`; any other count of none is reported. A counter
    badge carries over, and a formula badge's `value` is its `formula`. `start`, `tokenIcon`, `unidentified`
    and `context` are play state and are not carried.
- **Equipment kind data.** Foundry's `ammo` items are consumables of the `ammunition` category, its `backpack` items
  equipment with a `container`, and equipment with an `etched-onto-…` usage a `rune` (ADR-0023).
  - Every physical kind: the price's paid coins, with `per` for a batch; Bulk 0 as `negligible`, 0.1 as `light` and
    a whole number as itself (any other value leaves the item without data), with `bulkPer` the stack Foundry keeps in
    code (ten arrows, bolts, sling bullets, blowgun darts, wooden taws or rounds; a thousand coins; two thousand gems);
    a size other than medium, hardness and Hit Points above 0, and a precious material. `quantity`, `containerId`,
    `equipped`, `identification`, `temporary` and current Hit Points are play state.
  - Usage: `held-in-one-hand`, `held-in-one-plus-hands` and `held-in-two-hands`; `worn` and `worn<slot>`
    (`worncloak` is slot `cloak`); `affixed-to-`, `attached-to-`, `applied-to-`, `installed-in-` and `installed-on-`
    with what follows as `to`; and `tattooed-on-the-body`, `implanted`, `carried` and `other`. Any other usage
    (`bonded`, `held-in-one-or-two-hands`) is reported.
  - A weapon's category, group, base item and damage (an empty `die` is flat damage; a bomb's persistent damage as
    a formula), splash damage, range, reload (`-` is none) and `ammo` as `ammunition`. `bonus` is a bomb's
    `itemBonus`; on a specific weapon it repeats the potency rune and says nothing, and one that differs is reported.
    `bonusDamage`, an `expend` other than 1 and `grade` are reported.
  - Armour's category, group, base item, AC bonus, Dexterity cap and Strength, with penalties negated. A shield's AC
    bonus, hardness and Hit Points (a shield with none has no data) and a reinforcing rune; property runes on one
    are reported. A specific weapon's or armour's fundamental grades and property runes, each Foundry key
    (`greaterFlaming`) resolved to its `rune` entry (`rune:flaming-greater`); `specific` repeats them and is not read.
  - A consumable's category, uses (more than one), `kept` when Foundry does not destroy it once spent (a wand), its
    damage or healing (`untyped` is reported and left out), and a scroll's or wand's embedded spell as its `spell`
    entry by slug at the rank Foundry casts it. Ammunition is fired as the kinds Foundry crafts it as, or its own
    kind; it fits any weapon that doesn't take a magazine when Foundry names none. `canBeAmmo` is reported.
  - Equipment's usage and apex attribute; a container's capacity, the Bulk it ignores however it is carried, and its
    Bulk held when that differs from worn. A capacity of 0 and a container whose contents Foundry does not stow
    (`stowing: false`, a sack) are reported. Treasure keeps its category.
  - A rune is fundamental when its slug is one of the potency, striking, resilient or reinforcing grades
    (`striking-greater` is grade 2), else property. Its usage gives the item it is etched onto and a restriction
    spelled out (`etched-onto-med-heavy-armor` is armour, `medium-or-heavy`); an alignment rune goes on a weapon
    without the opposite rune (`weapon-wo-holy-rune` is `without-unholy-rune`; Foundry's labels are swapped), read
    against the property runes already etched, and one naming no item leaves the rune without data. What a property
    rune does Foundry keeps in code, so its `rules` are not imported.
- **Archetypes.** Foundry keeps them as pages of the `Archetypes` journal, not items. A page whose dedication (a
  linked feat with the `dedication` trait and the page's name, so another archetype's dedication cited as a
  prerequisite is not taken) is imported becomes an `archetype` entry in the target pack: the page name, the page's
  introduction as its description, the dedication's rarity and source, the page's UUID in `externalIds.foundry`,
  and the class it is named after as `multiclass` when the dedication is `multiclass`. Each archetype feat belongs
  to the archetype whose page links it; of several, to the one whose dedication its prerequisites name. A page whose
  dedication is outside the import is left for that book's.
- **References.** Foundry links an item by compendium UUID ending in its id or its name
  (`Compendium.pf2e.conditionitems.Item.Off-Guard`), and a condition names what it overrides by slug. Both resolve
  to the selected documents' ids. A `GrantItem`'s `uuid` becomes its `item`, and Foundry's `inMemoryOnly` and
  `onDeleteActions` are dropped when the grant goes with its granter (`granter: cascade`, Foundry's default for an item
  that is not physical), since a grant is always derived. One that resolves to nothing, whose grantee outlives its
  granter (`detach`, the default for a physical item), or whose grantee takes its granter with it, stays untranslated.
  A grant whose only alteration overrides the granted condition's value with a number
  (`{ mode: override, property: badge-value, value: 2 }`) gets that number as its `value`; any other alteration, or a
  value read from a pick or the item, leaves it untranslated.
  A `Sense` rule's `selector` resolves to its `sense` entry as `sense`; Foundry ignores the acuity of a sense that
  fixes one and the range of an unlimited one, so those are left off. An unknown sense, a range read from a formula, or
  `force: true` leaves it untranslated.
- **Vocabulary.** Traits, languages, senses and damage types are not pack documents: Foundry defines them in config
  modules (`src/scripts/config/traits.ts`, `src/module/actor/creature/values.ts`, `src/module/system/damage/values.ts`),
  which build their tables with spreads and remeda. The CLI runs them with Bun from the verified archive, standing in
  for remeda and Foundry's build-time `SYSTEM_ID`. Only what the selected documents use is imported: their traits,
  ancestry languages, ancestry and heritage vision, `Sense` elements and feats' `subfeatures.senses`, and every Foundry
  damage type that is a Pioneer `DamageType`. Names come from `lang/*en.json`; each cites the book of the first document
  using it (damage types, the first target book). Vocabulary entries go into `core-rules`, beside the hand-authored
  rules core entries, slugged by kind like every entry (`trait:goblin`, `language:goblin`). One another official pack
  already has of the kind and name (the hand-authored languages and senses, or an earlier run's) is left to that entry.
  Secret languages (Wildsong) have no Pioneer rarity and `untyped` damage no `DamageType`; both are reported. Each Lore
  a background trains or a ritual checks, which Foundry keeps nowhere, gets its `statistic` entry the same way
  (`statistic:scribing-lore`, named as the first document naming it does; rules-engine.md, "Statistics are content").
  Pack output writes the new entries to `core-rules/imported/<pack>/<kind>.json`, beside, never into, the hand-authored
  `core-rules` files ([ADR-0033](../adr/0033-foundry-vocabularies-imported-into-core-rules.md)).
- **Later translators.** A translator that lands after its pack is imported is applied to the backlog: a command,
  built by Epic 2.6 (#21), translates the items it now covers into the committed entries and removes them from the
  backlog, keeping hand edits.
- **Pin.** `content/import/<pack>.json` also holds the pack's release tag and the SHA-256 of its archive
  (`{ "pin": { "tag", "sha256" }, "backlog" }`); the importer downloads the tag's source archive into
  `.data/foundry/` (gitignored), reuses it on later runs, and stops on a checksum mismatch. The pin is the pack's
  provenance for the Legal page and NOTICE.md. The backlog in the same file holds only selected entries' items, with
  art references stripped, and is never seeded, served or bundled.
- **Pack output.** Every translated entry, vocabulary and archetypes included, is parsed as a `ContentEntry`, and
  every id it holds must land on an entry in the output or in another official pack (`packOutput`). An entry with no
  kind data, or that the schema rejects, is left out. Leaving one out can strand others, so references are checked
  until none fails, and what references a left-out entry degrades as any link outside the import does: a rule
  element is dropped (a `GrantItem` of nothing stays untranslated), a `Ref` in rich text becomes its label, else the
  target's name, as text, and any other reference (a field of `data`) leaves the entry out too. Entries are written
  sorted by kind then slug, one `<kind>.json` per kind, with a `ContentEntry`'s key order, and formatted with
  oxfmt, so a re-run is a clean diff; the target pack's entry files are replaced whole, its `pack.json` kept. The
  catalog imports pack files statically (`json-packs.ts`), so the CLI names the files to register there and a test
  fails while any committed pack file is not.
- **Backlog.** `content/import/<pack>.json`'s `backlog` (`BacklogItem`), sorted by entry: per entry, its gaps (an
  untranslated rule element with Foundry's JSON, an unmapped field or value, an unresolved lang key, an enricher or
  markup kept as text, an unknown trait, a rule element dropped or a link unlinked for a left-out entry), and for a
  left-out entry why and Foundry's whole document; then documents that yield no entry, and vocabulary that does not
  translate. Art (`img`, `texture` and image paths) is stripped throughout.
- **Coverage report.** Per kind, over the committed packs and their backlog (`importCoverage`): entries, entries with
  every rule element translated (none untranslated or dropped), entries with nothing left in the backlog, entries
  with a page number, entries with an AoN link, and entries left out; then page coverage per book, actions with a
  `trigger` but no `triggerEvent`, and feats with `prerequisites` but no `prerequisitePredicate`. The importer prints
  the same table over its output. `bun run content:coverage` prints it, and CI runs it on PRs touching `content/` as
  the job summary and an artefact, never failing on it.
  Milestone exit criteria are written against these numbers ("fully translated" is nothing left in the backlog).
- **Ids.** Our ids stay UUIDv5 of `<pack>/<slug>`. The Foundry compendium UUID goes in `externalIds.foundry`,
  which is what makes Foundry export possible. The slug is the kind its Foundry type is filed under
  (`FOUNDRY_TYPE_KINDS`), then Foundry's slug (`system.slug`, else its slugified name) with diacritics folded
  (`feat:deja-vu`), since Pioneer slugs are ASCII ([ADR-0034](../adr/0034-entry-slugs-name-their-kind.md)). The Fly
  spell and action are `spell:fly` and `action:fly`. Two documents of one kind and name are reported, not guessed.
- **Sources.** Each envelope cites its target book with no page or AoN link, which `SourceRef` accepts
  (ADR-0005, amended): enrichment adds them, and the coverage report counts entries without them. When the import
  replaces a pack, each imported book source keeps the page and AoN link the replaced entry with the same pack and
  slug cited for that book (`carrySources`), so the hand-authored entries' sources survive their replacement.
- **Source enrichment.** Foundry has the book title but no page numbers or AoN links. They are added to the
  committed packs after the import, from a matcher over AoN's listing data and by hand. The method of obtaining
  AoN data must respect their terms; this is an open question tracked in the roadmap. Until resolved, entries ship
  with the book reference and whatever page or URL is known, and the coverage report shows the gap.
- **Trigger enrichment.** Foundry's triggers are text only. `bun run content:triggers` sets `triggerEvent` on every
  action, feat action and class feature action in the committed packs whose whole trigger matches a known wording
  ("Your turn begins.", "You cast a focus spell.") and that has none yet, so a hand correction is never
  overwritten. An action whose requirements are only `requirementsText` is skipped, since the engine can't read them;
  its event and a predicate for them are set by hand. A trigger with any other wording, or anything richer than
  words and links, is left for
  hand edit and listed by the coverage report.
- **Staff enrichment.** A staff prints its spells in a list ("**Cantrip** Ignition", "**3rd** Floating Flame,
  Fireball"). `bun run content:staves` sets `staff` on every staff in the committed packs that has none yet, so a
  hand correction is never overwritten, when every item of its one list opens with a rank and every name in it
  resolves to exactly one spell in the packs. Names are read longest-first and run together as often as comma
  separated, so a list that splits into spell names in more than one way is left alone, like a staff that names a
  spell no pack holds yet (most of the Treasure Vault staves, until the books that hold their spells are imported), a
  parenthesised note ("Elemental Absorption (water only)") or no list at all. The coverage report lists them.
- **Prerequisite enrichment.** Foundry's prerequisites are text only. `bun run content:prerequisites` sets
  `prerequisitePredicate` on every feat in the committed packs whose prerequisites all parse and that has none yet, so
  a hand correction is never overwritten. Each `;`-separated clause must hold, and is one of:
  - a rank in skills, Lores or Perception ("trained in Athletics", "master in Arcana, Nature, or Religion"),
    `{ "gte": ["skill:athletics:rank", 1] }`, untrained 0 to legendary 4;
  - an attribute minimum ("Strength +2"), `{ "gte": ["attribute:str:mod", 2] }`, as Foundry writes it;
  - a level ("8th level"), `{ "gte": ["self:level", 8] }`;
  - `holy` or `unholy`, `self:trait:holy` (ADR-0048);
  - the name of a feat, ancestry feature, ancestry, heritage, class or deity: the option its kind sets
    (`feat:shield-block`, `deity:primary:sarenrae`). Names resolve across every pack, ignoring case. A name several
    of these entries share is met by any of them, as is a name whose entries add a class in brackets: "Animal
    Companion" is Animal Companion or Animal Companion (Ranger). A kind word after a name narrows it ("leaf leshy
    heritage", "Cat Fall skill feat").

  Class features are not named. An archetype gives a muse, order or school without the class feature (Bard
  Dedication has no muse to pick yet), so `feature:warrior` would read as false for a character who meets "warrior
  muse"; such a clause stays unparsed. A class feature that is also a feat (the fighter's Shield Block) grants the
  feat, which names it.

  A list of items is `or` or `and` as it says; one that says both, or neither, does not parse. A feat with any clause
  that does not parse gets no predicate, since a partial one would read as met; the coverage report lists it. The
  `attribute` and `perception` namespaces are not in the core table yet, so until the builder sets those facts
  (#466) a predicate reading them is unknown, never false.

## Licensing

Imported content is ORC-licensed remaster material, so rules text is stored and displayed with ORC attribution.
Reserved Material (Paizo trade dress, art, Golarion names outside ORC) is not imported, or is handled under the
Community Use Policy. Foundry's own permission comes from its partnership agreement with Paizo, which does not
extend to Pioneer, so Foundry's data is never a licence for anything outside ORC. NOTICE.md is updated in
milestone 0 to reflect that prose is stored.

The public Legal page (footer link on every page, no account) states that all official content is derived from
the Foundry pf2e system, each pack imported once from the release it records and edited by Pioneer contributors
since (ADR-0031), carries the Paizo Community Use and ORC notices, and lists the
content caches (pack bundles by kind, Foundry release, content hash) for download. It is generated from pack
manifests and the book registry. See [ADR-0003](../adr/0003-content-as-data-imported-from-foundry.md) and
[ADR-0007](../adr/0007-oauth-required-public-content.md).
