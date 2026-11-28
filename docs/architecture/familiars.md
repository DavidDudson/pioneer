# Familiars

Output of the spike [#2041 spike(rules): compile the familiar rules with citations](https://github.com/DavidDudson/pioneer/issues/2041).
Every row names its source. Page numbers come from the Archives of Nethys search index (ADR-0073); the rule text was
read from the same index on 2026-11-28. Rows marked **assumption** have no quotable rule and are decisions, not facts.
The other familiar spikes and stories point at this file.

## Decisions

### 1. Base rules (Player Core)

| Rule                            | Value                                                                                                                                                                                    | Source                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| What a familiar is              | A mystically bonded creature tied to your magic. You gain the Pet general feat, except the pet has special abilities.                                                                    | Player Core pg. 212 (Familiars)                     |
| Size, type                      | A Tiny animal of a type you choose. Some grants change the trait (a leshy familiar is plant or fungus).                                                                                  | Pet, Player Core pg. 259                            |
| Level                           | Equal to the master's level.                                                                                                                                                             | Pet, Player Core pg. 259                            |
| AC and saves                    | Equal to the master's before circumstance or status bonuses or penalties. No attribute modifiers, never an item bonus.                                                                   | Pet, Player Core pg. 259                            |
| Perception, Acrobatics, Stealth | 3 + level, or the master's spellcasting attribute modifier + level when that is higher.                                                                                                  | Pet pg. 259; Modifiers and AC pg. 212               |
| Other skills                    | Level only. A Skilled ability raises one skill (not Acrobatics or Stealth) to level + spellcasting attribute modifier; it can be taken repeatedly for different skills.                  | Pet pg. 259; Skilled pg. 213                        |
| Hit points                      | 5 per level. Tough adds 2 per level.                                                                                                                                                     | Pet pg. 259                                         |
| Senses                          | Low-light vision, plus senses from abilities (darkvision, echolocation 20 ft precise hearing, scent 30 ft imprecise).                                                                    | Pet pg. 259                                         |
| Speed                           | 25 ft land, or an aquatic familiar with only a 25 ft swim Speed. Abilities add burrow 5, climb 25, fly 25, fast movement to 40, amphibious.                                              | Pet pg. 259                                         |
| Actions                         | Minion: 2 actions on your turn when you spend an action to Command an Animal (no Nature check). It cannot attack except to Escape or Force Open.                                         | Pet pg. 259                                         |
| Communication                   | Empathic sharing of emotions within 1 mile. No languages unless a Speech ability grants them.                                                                                            | Communication, Player Core pg. 212                  |
| Abilities per day               | 2, chosen each day in daily preparations from familiar abilities and master abilities. Innate abilities (a raven's flight) cannot be swapped out. At most one ability changes its trait. | Player Core pg. 212 (Selecting, Familiar Abilities) |
| Familiar vs master              | Familiar abilities mostly change the familiar; master abilities mostly change the master or the magic between them. Pet feat abilities count as familiar abilities.                      | Player Core pg. 212 and 214                         |
| Targeting                       | "Companion" in a stat block covers animal companions, familiars and others; "your familiar" targets only a familiar. A spell for a creature you lack does nothing.                       | Targeting Companions, Player Core pg. 212           |
| One at a time                   | A character holds one familiar (legacy text says so outright).                                                                                                                           | Core Rulebook pg. 217                               |

**Decision.** Derive every statistic from the master in the engine (#2050); store only the choices (form, name, the day's
abilities). **Reason.** Pillar 3 (nothing derived is persisted), and every number above is a function of master level
and spellcasting attribute.

### 2. What grants a familiar, and how it changes the ability count

| Source                                                                                                                                    | Effect                                                                                                                                                            | Source                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Witch class feature Familiar                                                                                                              | Two extra abilities: the patron's unique ability (always selected) and one more chosen daily. One more at levels 6, 12 and 18.                                    | Witch, Player Core pg. 178                 |
| Familiar feat (Elementalist, Shadowcaster, Soul Warden, Infernal Pactbreaker archetypes at level 4; wizard, sorcerer, magus, thaumaturge) | Gain a familiar.                                                                                                                                                  | Player Core pg. 201; Player Core 2 pg. 152 |
| Enhanced Familiar (feat 2, needs a familiar)                                                                                              | Four abilities a day instead of two. Witch adds the witch bonus on top. A wizard with the improved attunement thesis has a base of four before the thesis extras. | Player Core pg. 129; Player Core 2 pg. 153 |
| Incredible Familiar (feat 8, needs Enhanced)                                                                                              | Base of six instead of four. Witch adds the witch bonus on top.                                                                                                   | Player Core pg. 188                        |
| Improved Familiar Attunement (wizard thesis)                                                                                              | Extra ability, and another at 6, 12 and 18. Arcane bond is stored in the familiar; Drain Familiar replaces Drain Bonded Item.                                     | Player Core pg. 195                        |
| Leshy Familiar (druid, leaf order)                                                                                                        | A familiar with the plant or fungus ability, not counted against the limit.                                                                                       | Player Core pg. 127                        |
| Leshy Familiar Secrets (feat 4)                                                                                                           | One extra ability a day, drawn only from Grasping Tendrils, Purify Air, Verdant Burst, one at a time.                                                             | Player Core pg. 130                        |
| Spirit Familiar (feat 8), Stitched Familiar (feat 8)                                                                                      | Add a once-per-10-minutes activity (Shed Spirit, Stitching Strike). Divine or occult patron, arcane or primal patron.                                             | Player Core pg. 189                        |
| Familiar's Language (feat 2)                                                                                                              | Speak with the familiar's animal family; a changed familiar locks the feat for 1 week.                                                                            | Player Core pg. 187                        |

**Decision.** Count = base (2, 4 or 6) + class and thesis extras + leshy secrets. Model each as a rule element that
adds to a `familiarAbilitySlots` statistic, so the sheet can show where each slot came from. **Reason.** Enhanced and
Incredible replace the base; the witch and thesis extras add. Which one applies is data, not code.

### 3. Lifecycle

| Event                 | Rule                                                                                                                                                                                                                                 | Source                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Replace by choice     | Spend 1 week of downtime, releasing the previous familiar. Gaining a different companion that uses Pet lets you retrain the Pet feat.                                                                                                | Pet, Player Core pg. 259                   |
| Witch, familiar dies  | Undying: the patron replaces it during the next daily preparations. The new one may look different but knows the same spells. Prepared spells are unaffected.                                                                        | Witch (Familiar), Player Core pg. 178      |
| Hex use without it    | Hexes need no familiar present, but a dead or absent familiar makes some hexes useless, and a witch needs it to Refocus.                                                                                                             | Witch (Paizo clarification)                |
| Others, familiar dies | Legacy: 1 week of downtime, no cost. Remaster has no dedicated rule: the Pet feat's 1 week downtime replacement applies.                                                                                                             | Core Rulebook pg. 217; Pet pg. 259         |
| Death effects         | Verdant Burst casts a heightened `heal` when the familiar dies (rank one below the highest spell slot, needs 2nd-rank slots). Specific familiars may punish the master (homunculus Blood Link: 2d10 mental damage).                  | Player Core pg. 130; Player Core 2 pg. 171 |
| Tucked away           | Absorb Familiar: a 1-minute concentrate activity turns it into a mark; it cannot act except to turn back, is untouched by area effects, and can be healed. Recall Familiar: once a day, teleport it to your space from up to 1 mile. | Player Core pg. 214                        |
| Language lockout      | A changed familiar locks Familiar's Language for 1 week.                                                                                                                                                                             | Player Core pg. 187                        |
| Dying at 0 HP         | **Assumption.** No quoted rule. A familiar has no dying condition: at 0 HP it dies and fires its death effects (#2072).                                                                                                              | none                                       |
| Resurrection          | **Assumption.** No quoted rule, and a construct familiar is immune to healing. Raising is modelled as a state change back to active (#2078); the cost of any spell is the spell's own.                                               | none                                       |

**Decision.** The lifecycle is one state: active, absent (recalled, not present), absorbed or dead. A witch's dead
familiar is replaced at the next daily preparation and keeps its known spells; anyone else's needs a week of downtime.
**Reason.** Both come straight from the text above. Dead familiars keep their known spells in the record so
replacement can copy them.

### 4. Remaster and legacy

| Topic              | Remaster                                               | Legacy                                                  |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------- |
| Rules page         | Player Core pg. 212                                    | Core Rulebook pg. 217                                   |
| Ability count      | Chosen daily; Enhanced 4, Incredible 6                 | Chosen daily; fixed 2 (the same default)                |
| Replacement        | Pet feat, 1 week downtime; witch gets Undying          | 1 week of downtime, free                                |
| Specific familiars | Player Core 2 (Aeon Wyrd, Spellslime, Imp, Homunculus) | Advanced Player's Guide, Secrets of Magic, Dark Archive |

**Decision.** Pioneer is remaster first (architecture README pillar 5). A legacy character follows the remaster rules.
Legacy entries that a remaster entry replaces are imported as replaced (ADR-0077). Legacy-only familiar content is
catalogued by [#2047 spike(content): catalogue every feat, item and spell touching a familiar](https://github.com/DavidDudson/pioneer/issues/2047)
and added only if a remaster source has none. **Reason.** One edition per rule path keeps the engine small.
The differences above are small: replacement costs a week of downtime and no gold in both editions.

### 5. Form

A familiar is Tiny, an animal by default, and its species is flavour. What is mechanical: size (Tiny), traits (animal,
or plant, fungus, construct, spirit, undead, and so on from one ability), aquatic or land Speed, and whatever the
species already has naturally (the player must take those abilities, Pet pg. 259). **Decision.** Store form as a
named species plus an optional mechanical base (land or aquatic, natural abilities). **Reason.** The sheet shows the
name and species; the engine reads only the base and the chosen abilities.

## Stories

The stories were filed before this spike. Findings:

| Story                                                                                                           | Verdict                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#2072 a familiar dies at 0 HP and fires its death effects](https://github.com/DavidDudson/pioneer/issues/2072) | Confirmed. Death triggers come from Verdant Burst and from specific-familiar abilities. 0 HP death is an assumption (section 3).                                                                             |
| [#2073 a witch's patron replaces a dead familiar daily](https://github.com/DavidDudson/pioneer/issues/2073)     | Confirmed. Copies the dead familiar's known spells. Needs [#2065](https://github.com/DavidDudson/pioneer/issues/2065).                                                                                       |
| [#2074 other classes replace a dead familiar in downtime](https://github.com/DavidDudson/pioneer/issues/2074)   | Confirmed. 1 week of downtime. Blocked by Epic 5.13: Downtime activities.                                                                                                                                    |
| [#2077 Recall, Absorb and Stitched Familiar change state](https://github.com/DavidDudson/pioneer/issues/2077)   | **Correct.** Stitched Familiar and Spirit Familiar are activities that re-form the familiar in place; they are not state changes. Only Absorb and Recall move state. Move the two feats to the feat stories. |
| [#2079 effects that need a living familiar end with it](https://github.com/DavidDudson/pioneer/issues/2079)     | Confirmed. The witch clarification names hexes and Refocus.                                                                                                                                                  |
