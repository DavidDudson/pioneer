# Animal companions: rules reference

Output of the spike [#2127 spike(rules): compile the animal companion rules with citations](https://github.com/DavidDudson/pioneer/issues/2127).
It records the rules, the decision per question and the reason. The model is decided in
[#2128 spike(character): companion model and what it shares with familiars](https://github.com/DavidDudson/pioneer/issues/2128),
kinds in [#2129 spike(content): where companion kinds and stat blocks come from](https://github.com/DavidDudson/pioneer/issues/2129),
lifecycle in [#2131 spike(play): companion lifecycle, Command, mounts and reincarnation](https://github.com/DavidDudson/pioneer/issues/2131).

## How to read the citations

`PC` is Player Core, `PC2` Player Core 2. A citation is a book and page as printed, with the Archives of Nethys (AoN)
page it was read from. Quoted text is verbatim from AoN or the imported pack; unquoted text is a paraphrase.
Entries are named by pioneer slug (`feat:animal-companion`).

**Verification status.** AoN pages were read through a summariser, not the printed book, and no printed copy was
checked. Every row marked **Unconfirmed** needs the book before a story builds on it. Page numbers are as AoN prints
them; AoN prints `pg. 206` for the section and `pg. 211` for advancement, and the pack gives `p127` to the feat.

## 1. Base rules: acquiring, tiers, statistics

### Acquiring

| Rule                                                                                                                                                            | Source                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Druid: the Animal order grants the Animal Companion feat (`feat:animal-companion`, level 1, prerequisite `feature:animal-order`).                               | PC p. 127, [AoN](https://2e.aonprd.com/Feats.aspx?ID=4708); `class-feature:animal-order` has no page in the pack |
| Ranger: `feat:animal-companion-ranger`, level 1; when you Hunt Prey the companion "gains the action's benefits and your hunter's edge benefit if you have one". | PC p. 127, [AoN](https://2e.aonprd.com/Feats.aspx?ID=4708)                                                       |
| The companion has the animal and minion traits.                                                                                                                 | PC p. 206, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2113)                                                       |
| "You can have only one animal companion at a time."                                                                                                             | PC p. 206, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2112)                                                       |

### Tiers

| Tier        | Granted by (level)                                                                                                                         | What changes                                                                                                                                                                                                                            | Source                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Young       | `feat:animal-companion` (1), `feat:animal-companion-ranger` (1)                                                                            | Base block below.                                                                                                                                                                                                                       | PC p. 206, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2114)                                              |
| Mature      | `feat:mature-animal-companion-druid` (4), `feat:mature-animal-companion-ranger` (6)                                                        | One size up if Medium or smaller. Str, Dex, Con, Wis +1. Perception and all saves expert. Intimidation, Stealth, Survival trained (expert if the type already trained it). Unarmed damage one die to two. Independence (see section 2). | PC p. 211, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2117); druid feat PC p. 130; ranger feat PC p. 159 |
| Nimble      | `feat:incredible-companion-druid` (8), `feat:incredible-companion-ranger` (10); a mature companion, player's choice                        | Dex +2; Str, Con, Wis +1. Acrobatics expert. Unarmed attacks +2 damage and magical. Learns the type's advanced maneuver.                                                                                                                | PC p. 211, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2118); druid feat PC p. 132; ranger feat PC p. 161 |
| Savage      | the same feats; the alternative to nimble                                                                                                  | One size up if Medium or smaller. Str +2; Dex, Con, Wis +1. Athletics expert. Unarmed attacks +3 damage and magical. Learns the type's advanced maneuver.                                                                               | PC p. 211, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2119)                                              |
| Specialized | `feat:specialized-companion-druid` (14), `feat:specialized-companion-ranger` (16); up to three times, a different specialization each time | Unarmed attacks expert; saves and Perception master. Dex +1, Int +2. Damage two dice to three; extra damage 2 to 4 or 3 to 6. Plus the specialization's own benefit (below).                                                            | PC p. 211, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2120); druid feat PC p. 135; ranger feat PC p. 162 |

Specializations (first one gets the shared block above, "Most companions can have only one specialization"):

| Specialization | Benefit                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Ambusher       | Sneak while observed in its natural environment; Stealth expert (master if already expert); Dex +1; unarmored defense expert |
| Bully          | Athletics and Intimidation expert (master if already expert); Str +1; Cha +3                                                 |
| Daredevil      | The deny advantage ability; Acrobatics master; Dex +1; unarmored defense expert                                              |
| Racer          | +10 feet status bonus to one of Speed, swim Speed or fly Speed; Fortitude legendary; Con +1                                  |
| Tracker        | Move at full Speed while tracking; Survival expert (master if already expert); Wis +1                                        |
| Wrecker        | Unarmed attacks ignore half an object's Hardness; Athletics master; Str +1                                                   |

Source for the table: PC p. 211, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2120). Other tier feats: `feat:stealthy-companion` (14, PC p. 162, gives
Camouflage and raises a specialized ambusher's Stealth), `feat:masterful-companion` (18, PC p. 163, the companion
gets the hunter's edge benefit "rather than just your original"), `feat:companions-cry` (4, PC p. 159, 2 actions on
Command an Animal instead of 1).

### Statistics derived from the master

| Statistic                             | Rule                                                                                                                                                                                                | Source                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Level                                 | "Your animal companion's level is equal to yours."                                                                                                                                                  | PC p. 206, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2114) |
| Hit points                            | Ancestry HP from its type, plus "6 plus its Constitution modifier for each level you have."                                                                                                         | PC p. 206, same                                            |
| Proficiency                           | Trained in unarmed attacks, unarmored defense, barding, all saving throws, Perception, Acrobatics and Athletics, plus one skill from its type. Ranks rise by tier (above).                          | PC p. 206, same                                            |
| Attributes                            | Base modifiers from the type's stat block, plus the tier increases. Not derived from the master's attributes.                                                                                       | PC p. 206, same                                            |
| Modifiers and DCs                     | Calculated the same way as the master's. Item bonuses apply only to Speed and AC; the maximum item bonus to AC is +3.                                                                               | PC p. 206, same                                            |
| AC, Perception, skills, attack, saves | Follow from the proficiency rank, level and attribute by the normal proficiency formula. AoN states no separate formula. **Unconfirmed** against the book: any companion-specific rule beyond this. | AoN page above                                             |
| Intelligence                          | A companion without a specialization cannot use abilities that need more Intelligence, such as Coerce or Decipher Writing.                                                                          | PC p. 206, same                                            |

Companion type fields (size, unarmed attacks, attribute modifiers, ancestry HP, extra trained skill, senses, Speeds,
special abilities, Support Benefit, Advanced Maneuver): [AoN](https://2e.aonprd.com/Rules.aspx?ID=2115), types on PC
pp. 206 to 209 per the [AoN companion list](https://2e.aonprd.com/Companions.aspx) (Ape, Arboreal Sapling, Badger,
Bat, Bear, Bird, Boar, Cat, Crocodile, Dromaeosaur, Horse, and more from Howl of the Wild, Rage of Elements and other books).
**The values per type are not in the packs and were not read.** They belong to #2129.

**Decision.** Statistics are derived at read time from master level, the tier and the type's block; nothing is stored.
**Reason.** Pioneer's pillar "no derived value is stored" ([README](README.md)), and the rules make every number a
function of level, tier and type. The tier itself derives from the feats the master holds, so removing an upgrade
lowers it with no stored copy (the intent of [#2138 feat(engine): upgrade feats move the companion up a tier](https://github.com/DavidDudson/pioneer/issues/2138)).

## 2. Command and Support

| Rule                                                                                                                                                                                                                                                                     | Source                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| The companion "gains 2 actions during your turn if you use the Command an Animal action to command it"; this "replaces the usual effects of Command an Animal, and you don't need to attempt a Nature check."                                                            | PC p. 206, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2113); `action:command-an-animal`, PC p. 242 |
| Command an Animal is 1 action; `feat:companions-cry` lets you spend 2 to give the companion an additional action.                                                                                                                                                        | PC p. 242; PC p. 159                                                                              |
| Uncommanded: after Mature, "even if you don't use the Command an Animal action", it can use 1 action on your turn to Strike or Stride (or Burrow, Climb, Fly or Swim); that is all its actions that round and you cannot Command it later.                               | `feat:mature-animal-companion-druid` PC p. 130; ranger PC p. 159; both "During an encounter"      |
| Uncommanded **before** Mature: AoN's rule page says nothing. **Unconfirmed**; read the book before #2151 builds on it.                                                                                                                                                   | [AoN](https://2e.aonprd.com/Rules.aspx?ID=2113)                                                   |
| Support (1 action, requires an animal companion): you gain the Support Benefit in its type's entry. If it uses Support, its only other actions that turn are basic move actions to get into position; if it already used another action that turn it cannot Support you. | PC p. 206, [AoN](https://2e.aonprd.com/Actions.aspx?ID=2665)                                      |
| The Support Benefit text is per type.                                                                                                                                                                                                                                    | [AoN](https://2e.aonprd.com/Rules.aspx?ID=2115); values not read                                  |

**Decision.** Command is modelled as the master's action granting the companion 2 actions that turn; Support is a
master action whose effect is the type's benefit as a rule element (#2141). The uncommanded rule is a mature-tier
feature, and the pre-mature case waits for the book check.
**Reason.** The rules put both in the master's action economy, and the benefit lives in the type's block, so it
belongs to the kind content (#2129).

## 3. Advanced maneuver, barding, items, speed, size, mounts

| Rule                                                                                                                                                                                                                                                | Source                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Advanced maneuver: each type names one; a nimble or savage companion learns it. Details per type, not on the rules page.                                                                                                                            | [AoN](https://2e.aonprd.com/Rules.aspx?ID=2118), [AoN](https://2e.aonprd.com/Rules.aspx?ID=2119); **Unconfirmed** per type |
| Pack naming clash: `feat:advanced-maneuver` (PC p. 219) is a different thing (a fighter archetype feat). A companion's maneuver is not a feat.                                                                                                      | Pack                                                                                                                       |
| Barding: a proficiency the companion has ("a type of armor for animals"). Light barding, heavy barding (small or medium, large): `armor:light-barding`, `armor:heavy-barding-small-or-medium`, `armor:heavy-barding-large`.                         | PC p. 295, [AoN](https://2e.aonprd.com/Equipment.aspx?ID=2778)                                                             |
| Other items: item bonuses apply only to Speed and AC, AC item bonus capped at +3.                                                                                                                                                                   | PC p. 206, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2114)                                                                 |
| Size and Speed: from the type; mature and savage grow one size if Medium or smaller; Racer adds +10 feet to one Speed; `spell:enlarge-companion` makes it Large (Huge heightened to 4th).                                                           | PC p. 211; PC p. 383, [AoN](https://2e.aonprd.com/Spells.aspx?ID=1867)                                                     |
| Mount: you or an ally can ride it if it is at least one size larger than the rider; it then uses only its land Speed and cannot move and Support on the same turn. A companion with the mount special ability "ignores both of these restrictions". | PC p. 206, [AoN](https://2e.aonprd.com/Rules.aspx?ID=3417), [AoN](https://2e.aonprd.com/Rules.aspx?ID=2112)                |

**Decision.** A companion that is a mount is the same companion plus a rider state; the restrictions are conditional
modifiers, with the mount special ability lifting them. **Reason.** The rules add no second creature; they restrict
the companion's own actions while carried. Detail is #2131 and #2152.

## 4. Lifecycle

| Rule                                                                                                                                                                                                      | Source                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Death: "If your companion dies, you can spend a week of downtime to replace it at no cost."                                                                                                               | PC p. 206, [AoN](https://2e.aonprd.com/Rules.aspx?ID=2113)    |
| Heal: `spell:heal-companion` restores 1d10 HP (touch, 1 action); 2 actions, 30 feet, an additional 8 HP; +1d10 and +8 per rank above 1st.                                                                 | PC p. 383, [AoN](https://2e.aonprd.com/Spells.aspx?ID=1864)   |
| Call Companion (beastmaster): 1 minute to swap the active companion.                                                                                                                                      | PC2 p. 189, [AoN](https://2e.aonprd.com/Actions.aspx?ID=2900) |
| What rest resets, reincarnation, and any source overriding the one-week replacement: **not found**. `feat:reincarnated-companion` (Revenge of the Runelords p. 78) is imported but its text was not read. | #2131 must close this from the book and the remaining sources |

**Decision.** Replacement is a downtime action that archives the dead companion and creates a new one; death is a
state, not a deletion. **Reason.** ADR-0062 (user content is archived, never deleted). Numbers above are the base;
the open rows are a stated gap, not an assumption.

## 5. Remaster against legacy

| Fact                                                                                                                                                                                                                             | Source                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Pioneer is remaster-first; legacy entries are OGL, held back until the Legacy Content variant rule is on, per campaign or per character.                                                                                         | [content-model.md](content-model.md) "Legacy content is off by default"; ADR-0031; ADR-0077    |
| Legacy companion entries in the packs are sparse: APG and Core Rulebook copies of Beastmaster, Cavalier, Additional Companion and Call Companion; Core Rulebook mount feats. No pack entry carries the old companion rules text. | Pack inventory                                                                                 |
| The legacy rules text for tiers, Command and death was **not read**: AoN served the remaster text for the legacy page IDs (151, 155).                                                                                            | [AoN](https://2e.aonprd.com/Rules.aspx?ID=151), [AoN](https://2e.aonprd.com/Rules.aspx?ID=155) |

**Decision.** A character follows the remaster rules unless the Legacy Content variant is on; no rule difference is
modelled until one is confirmed. **Reason.** The remaster text is the one read; guessing a legacy difference would
put an unsourced rule in the engine. Closing this needs the Core Rulebook and APG text.

## 6. Who grants companions, and several at once

| Source                                                                                                                                                                                                     | Grants                                                                                                                                                                                                                                                | Source                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Druid (Animal order), ranger                                                                                                                                                                               | One young companion                                                                                                                                                                                                                                   | PC p. 127                                                   |
| Beastmaster archetype                                                                                                                                                                                      | `feat:beastmaster-dedication` (2): a young companion, "Contrary to the usual rules for animal companions, this feat can grant you a second animal companion."                                                                                         | PC2 p. 188, [AoN](https://2e.aonprd.com/Feats.aspx?ID=6267) |
| `feat:additional-companion` (4)                                                                                                                                                                            | Another young companion with the minion trait; can be taken more than once, "to a maximum of four total companions"                                                                                                                                   | PC2 p. 188, [AoN](https://2e.aonprd.com/Feats.aspx?ID=6268) |
| Several companions                                                                                                                                                                                         | Only the "active companion" follows you in exploration and encounters; the others are nearby foraging. Swap with Call Companion (1 minute). Beastmaster tier feats act on every companion; nimble/savage and specialization are chosen per companion. | PC2 pp. 188 to 189                                          |
| Beastmaster focus spells, `feat:beastmasters-call` (12), `feat:beastmaster-bond` (10)                                                                                                                      | Telepathy within 100 feet; a once-per-turn projection of a non-active companion for its Support Benefit                                                                                                                                               | PC2 p. 189                                                  |
| Cavalier archetype, Commander and other archetypes, construct and dragon companions, spirit companions (Divine Mysteries p. 295), Draconic Codex p. 220, Guns & Gears pp. 25 to 30, Howl of the Wild p. 65 | Imported as feats; none read for rules                                                                                                                                                                                                                | Pack inventory; #2132 catalogues them                       |

The full "Beastmaster Animal Companions" sidebar was only partly read; **Unconfirmed** beyond the quotes above.

**Decision.** A character holds a list of companions, one of which is active; "one animal companion at a time" is the
default and the Beastmaster feats are the override. **Reason.** The rules say so directly, and a list with an active
member covers both. The shape is #2128's to fix.

## Gaps in pioneer today

- Companion types (bear, wolf, horse and the rest) are not imported; `remaster-audit.ts` lists `Animal Companion` under
  `MISSING_KIND_TYPES`. Support benefits and advanced maneuvers sit inside them.
- The companion feats carry prose only (`rules: []`).
- The prerequisite matcher leaves "an animal companion" Unknown (#2137).
- Pathbuilder `pets` is not parsed.

## Open for the book

1. Uncommanded behaviour before Mature.
2. Per-type Support Benefit, advanced maneuver, Speeds, senses and unarmed attacks.
3. Reincarnation, what rest resets, and any override of the one-week replacement.
4. Legacy text for tiers, Command and death.
5. The full Beastmaster Animal Companions sidebar.
