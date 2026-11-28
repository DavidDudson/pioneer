# Companion kinds and stat blocks: where they come from

Output of the spike [#2129 spike(content): where companion kinds and stat blocks come from](https://github.com/DavidDudson/pioneer/issues/2129).
It builds on the rules in [animal-companions.md](animal-companions.md) (spike
[#2127 spike(rules): compile the animal companion rules with citations](https://github.com/DavidDudson/pioneer/issues/2127))
and the model in [ADR-0080](../adr/0080-an-animal-companion-is-a-companion-row-with-a-species.md). Part of
[#2122 Epic 23.2: Companion kinds and stat blocks](https://github.com/DavidDudson/pioneer/issues/2122).

**How it was read.** The Foundry pf2e archive at the importer's pin (`pf2e-8.6.0`) was unpacked and searched; the
Archives of Nethys (AoN) search index was queried for the `animal-companion`, `animal-companion-advanced`,
`animal-companion-specialization` and `animal-companion-unique` categories (123, 8, 17 and 2 documents). AoN gives the
printed stat block, not a summary. No printed book was checked, so page numbers are AoN's.

## 1. Every kind, and where its stat block lives

AoN lists 123 animal companion documents. 18 are legacy copies of a remaster entry (Core Rulebook, Advanced Player's
Guide, Treasure Vault), so **105 current entries** exist. Pioneer holds 16 (Player Core, plus a Large variant of the
horse). 89 are missing.

| Source                                                                           | Entries | Pack registered | Entries                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------: | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player Core pp. 206 to 210                                                       |      16 | yes, **done**   | Ape, Arboreal Sapling, Badger, Bat, Bear, Bird, Boar, Cat, Crocodile, Dromaeosaur, Horse, Riding Drake, Scorpion, Shark, Snake, Wolf                                                                           |
| Howl of the Wild pp. 90 to 95                                                    |      19 | yes             | Antelope, Elk, Flying Squirrel, Giant Eel, Giant Frog, Giant Wasp, Giraffe, Griffon, Hippocampus, Hippogriff, Kangaroo, Mole, Mongoose, Orca, Riding Tarantula, Roc, Salamander, Shotalashu, Umbrella Mushroom |
| Rage of Elements p. 40 to 41                                                     |       6 | yes             | the six elementals                                                                                                                                                                                             |
| Shining Kingdoms                                                                 |       6 | yes             | Bacallia, Cragstone Bear, Giant Rock Tuatara, Gray Bladeling, Keulia, Severed Head                                                                                                                             |
| Book of the Dead pp. 38 to 39                                                    |       5 | yes             | Ghost, Skeletal Mount, Skeletal Servant, Vampiric Animal, Zombie                                                                                                                                               |
| Cheliax, Infernal Inheritance                                                    |       5 | yes             | Goblin Dog, Knurled Worm, Regal Toad, Thorngrip Shuffler, Yzobu                                                                                                                                                |
| Tian Xia Character Guide                                                         |       5 | yes             | Durian Crab, Hermit Krait, Sundaflora, Tikar Urchinpad, Yzobu (same name as the one above)                                                                                                                     |
| High Seas                                                                        |       4 | yes             | Cephalopod, Iridescent Salamander, Pufferfish, Silt Frog                                                                                                                                                       |
| Treasure Vault (Remastered)                                                      |       2 | yes             | Oozeform Chair, Rootball Chair                                                                                                                                                                                 |
| Draconic Codex, Impossible Lands, Secrets of Magic, Hellbreakers, Hell's Destiny |  1 each | yes             | Riding Dragonet, Water Wraith, Shadow Hound, Isgeri Boarhound, Thruneosaurus Rex                                                                                                                               |
| Grand Bazaar                                                                     |       6 | no              | Beetle, Capybara, Legchair, Moth, Pangolin, Terror Bird                                                                                                                                                        |
| Pathfinder adventure paths (#149, #154, #177, #181, #201, #208, #209)            |      22 | no              | Camel, Hyena, Vulture, Cave Gecko, Cave Pterosaur, Monitor Lizard, Elephant, Rhinoceros, Triceratops, Tyrannosaurus, five undead (#181), Chetamog, War Pig, Wyvern                                             |
| Feybound, Highhelm, Monsters of Myth, Jimothy                                    |       8 | no              | Cu Sith, Giant Dragonfly, Unicorn, Augdunar, Draft Lizard, Goat, Ulgrem-Lurann, Jimothy                                                                                                                        |

73 entries sit in books pioneer already registers (57 not yet imported); 32 sit in books it has no pack for. Legacy-only
kinds do not exist: every legacy entry has a remaster twin. Specializations: 6 in Player Core p. 211 (pioneer's
`CompanionSpecialization`), plus Deep Diver, Steadfast Strider, Wildfire Scorcher and Wind Chaser (Legends) and Shade
(Secrets of Magic). Advanced options: Nimble and Savage (Player Core p. 211), plus Unseen (Dark Archive), Indomitable
(World Guide) and Genie-Touched (Legends).

**Where the data is.**

| Source                                            | Holds companion types?                                                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundry pf2e system at `pf2e-8.6.0` (the pin)     | **No.** There is no companion pack. `pathfinder-npc-core/creature-companions` has four NPC statblocks (Trained Bat, Experienced Hound, Veteran War Horse, Beast Eidolon); the iconics hold built characters.                  |
| Foundry module `TikaelSol/PF2e-Animal-Companions` | Yes, as `ancestry` items beside one `class` item "Animal Companion", support `action` items and advanced-maneuver items. A separate repository from the pf2e system, no repository licence, ORC and OGL texts in `licenses/`. |
| AoN                                               | Yes, all 123, with size, attributes, Hit Points, skill, senses, Speeds, unarmed attacks, Support Benefit and Advanced Maneuver.                                                                                               |

**Decision.** Companion kinds come from AoN, not from Foundry; the importer's creature selection stays as it is.
**Reason.** The pinned archive has nothing to select. The community module is a second dependency with no licence file
for its own text, outside the pin, and Pioneer takes Foundry data only from `foundryvtt/pf2e` at a recorded checksum
(content-model.md, "Pin"). AoN already fed the 16 Player Core entries (#2265) and carries every field.
Each entry is authored into a pack's `companion-species.json` only when its book is registered, so the licence class
(ORC or OGL) is the pack's. Entries in unregistered books wait for their pack, recorded as a reason, not imported.

## 2. A creature entry, or its own kind?

**Decision.** Its own kind, `companion-species` (landed in #2265), not a creature entry with the `companion` trait.
**Reason.** A creature has a fixed level, Hit Points and modifiers. A companion has none of its own: level is the
master's, Hit Points are ancestry plus 6 per level, proficiency comes from the tier, and attacks gain dice by tier
(animal-companions.md section 1). The block stores only what belongs to the species, and the engine derives the rest.
A creature entry could not hold a block without a level. The entry still renders in the content browser through the
generic kind view.

**How tier changes are data.** They are not per species. Player Core p. 211 gives one table for every companion
(mature, nimble or savage, specialized, apex), and the engine already derives it from `CompanionTier`
(#2135, #2138). Only four things vary per species:

| Variation                                                                                                            | Where it belongs                                                        |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Support Benefit numbers that grow when nimble or savage (Bear 1d8 to 2d8, Bird, Boar, Scorpion, Shark, Riding Drake) | the benefit's rule elements, predicated on a tier roll option           |
| Scorpion stinger: extra poison dice when specialized                                                                 | the species' `special`, as a damage rule element predicated on the tier |
| Size growth at mature or savage when Medium or smaller                                                               | engine, from the block's `size`                                         |
| Racer: +10 feet to one Speed                                                                                         | the specialization, not the species                                     |

[#2140 feat(rules): tier changes for each companion kind](https://github.com/DavidDudson/pioneer/issues/2140) is
**reduced**: the shared table is engine work; the per-species part is the benefit scaling, which is
[#2141 feat(rules): support benefits as rule elements](https://github.com/DavidDudson/pioneer/issues/2141).

## 3. Support benefits and advanced maneuvers against the rule elements

All 16 Player Core benefits are read below. Every benefit lasts "until the start of your next turn" and acts on the
master's Strikes against a creature in the companion's reach.

| Benefit                                             | Companions                                                                                                                                 | Expressible today?                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Extra damage on a hit in reach                      | Bear, Shark, Riding Drake                                                                                                                  | `DamageDice`, once a predicate can say "in my companion's reach" (**gap G2**) and a tier option (**G3**) |
| Persistent damage on a Strike that damages in reach | Boar, Bird (plus dazzled), Scorpion                                                                                                        | `DamageDice` with `category: persistent`; dazzled is **G1**                                              |
| Condition on the target after a hit                 | Ape (frightened 1), Cat (off-guard), Arboreal Sapling (difficult terrain), Wolf (Speed penalty), Badger (no Step), Bat (-1 attack penalty) | **G1**: no element applies a condition or effect to a target                                             |
| Position or reaction changes                        | Dromaeosaur (flanking from a chosen space), Snake (no reactions), Crocodile (latch)                                                        | **G4**: no flanking override or reaction block; Crocodile is a `Note` until then                         |
| Mounted bonus                                       | Horse                                                                                                                                      | `DamageDice` with roll options for "mounted" and "moved 10 feet" (**G5**, the options)                   |

Also gaps: the "until the start of your next turn" window is an effect with a duration, which the support action must
start (**G6**: Support as an action that applies a timed effect, also needed by #2142).

Advanced maneuvers are one named action per species (Frightening Display, Bear Hug, Takedown and the rest), each a
`Strike` or `Stride` with a rider: the same shape as a feat action. They are expressible as `action` content with
`NoteElement` text today and fully only once G1 and G6 land. They are not feats: `feat:advanced-maneuver` is a
different entry (animal-companions.md section 3).

| Gap | What is missing                                                        | Story                                |
| --- | ---------------------------------------------------------------------- | ------------------------------------ |
| G1  | Rule element that applies a condition or effect to a target on a hit   | new, blocks #2141 and #2142          |
| G2  | Predicate: target is within the companion's reach, or threatened by it | new, blocks #2141                    |
| G3  | Roll option for the companion's tier (nimble or savage, specialized)   | folded into #2141                    |
| G4  | Flanking override, reaction block, latch                               | new, after G1                        |
| G5  | Roll options for mounted and moved 10 feet                             | folded into #2141                    |
| G6  | Support as a timed effect the master starts                            | folded into #2141, shared with #2142 |

## 4. Special companions

| Group                                                                                                                                                             | Same shape as an animal companion?                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Undead (Book of the Dead, Zombie Feast), elementals (Rage of Elements), oozes and chairs (Treasure Vault), Riding Dragonet (the `dragon` trait replaces `animal`) | **Yes.** Same AoN category, same fields. Differences are traits (`undead`, `mindless`, `ooze`), `special` lines (anchored incorporeality, mindless) and some benefits with a range (Zombie: within 10 feet of the zombie). `traits` already carry them. |
| Mounts (Horse, Riding Drake, chairs, Skeletal Mount, Zombie Mount)                                                                                                | Yes. The `mount` special line is the only mark; ADR-0080 keeps a mount the same row.                                                                                                                                                                    |
| Construct companion (Inventor, Guns & Gears pp. 17 to 34)                                                                                                         | **No.** Its base is the innovation, not a species list: a block chosen by modifications, then advanced by its own rules (+1 to four attributes, two dice, expert saves). Own stat-block builder.                                                        |
| Dragon companions (Drake Rider archetype, Draconic Codex p. 220)                                                                                                  | Partly. The Riding Drake and Riding Dragonet are species; Mature and Incredible Dragon Companion are tier feats with their own table, read from the feats, not read for rules here.                                                                     |
| Megafauna (Lost Mammoth Valley, Burning Tundra, World Guide)                                                                                                      | **Unconfirmed.** Own creation rules ("Creating Megafauna", "Megafauna Features"); not read.                                                                                                                                                             |
| Spirit (Divine Mysteries p. 295), Undead Companion (Ancestry Guide p. 27), Bond Companion (Dragonet)                                                              | Feat-only; not read.                                                                                                                                                                                                                                    |
| Eidolons (26 AoN documents, category `eidolon`)                                                                                                                   | **No.** A summoner's own model, out of this epic.                                                                                                                                                                                                       |

[#2143 feat(rules): construct, dragon, undead and other special companions](https://github.com/DavidDudson/pioneer/issues/2143)
is **split**: undead, elemental, ooze and dragonet species are plain species content (the import story); only the
construct companion and the dragon tier feats need new rules. Megafauna, spirit and the ancestry undead companion
get their own read first.

## 5. Legacy kinds against the remaster ones

AoN pairs them: each Core Rulebook and Advanced Player's Guide companion holds a `remaster_id` pointing at the
Player Core entry, and each Player Core entry a `legacy_id` back (Badger `animal-companion-68` to `-1`, Wolf `-83`
to `-8`). The 16 Player Core entries are the same animals as the 16 legacy ones with the same names. The two
Treasure Vault chairs and the Nimble, Savage and Unseen advanced options have the same twin pairs.

**Decision.** One species entry per remaster name; the legacy entry is the same entry, not a second one.
**Reason.** The names and animals match one to one, so a legacy-rules character takes the remaster block (OGL text is
not re-authored). Whether any number differs between a legacy block and its remaster twin was **not compared**;
close it by diffing the two AoN blocks before the Legacy Content variant needs a different block.

## 6. Stories for the epic

| Story                                                                                                                           | Verdict                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [#2139 feat(content): companion kinds are content with stat blocks](https://github.com/DavidDudson/pioneer/issues/2139)         | Closed with the 16 Player Core kinds. The remaining kinds are the new import stories below. |
| [#2140 feat(rules): tier changes for each companion kind](https://github.com/DavidDudson/pioneer/issues/2140)                   | Reduced to the benefit scaling; merged into #2141 (section 2).                              |
| [#2141 feat(rules): support benefits as rule elements](https://github.com/DavidDudson/pioneer/issues/2141)                      | Kept, blocked by G1 and G2.                                                                 |
| [#2142 feat(rules): advanced maneuvers as actions](https://github.com/DavidDudson/pioneer/issues/2142)                          | Kept, blocked by G1 and G6.                                                                 |
| [#2143 feat(rules): construct, dragon, undead and other special companions](https://github.com/DavidDudson/pioneer/issues/2143) | Split (section 4).                                                                          |
| [#2144 feat(rules): barding and companion items](https://github.com/DavidDudson/pioneer/issues/2144)                            | Unchanged.                                                                                  |
| New: import Howl of the Wild companions (19) and Rage of Elements elementals (6)                                                | Blocked by nothing.                                                                         |
| New: import companions of the other registered books (32)                                                                       | Same slice, one PR per few books.                                                           |
| New: rule element to apply a condition or effect to a target on a hit (G1)                                                      | Blocks #2141 and #2142.                                                                     |
| New: predicate for a target in the companion's reach (G2)                                                                       | Blocks #2141.                                                                               |

## Open for the book

1. Printed page numbers for every entry outside Player Core (AoN's only).
2. Any number that differs between a legacy block and its remaster twin.
3. Megafauna, spirit, dragon tier and the ancestry undead companion rules.
4. Per-species Support Benefit text for the 89 missing kinds, read when each is imported.
