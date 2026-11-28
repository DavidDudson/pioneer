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
| Resurrection          | Familiar's Resurrection (Impossible Magic): 10-minute cast, range 10 ft, targets your dead familiar of 4th level or lower (+2 levels per heightened rank); it returns with 1 HP. Cost is the spell's own.                            | Impossible Magic pg. 137                   |

**Decision.** The lifecycle is one state: active, absent (recalled, not present), absorbed or dead. A witch's dead
familiar is replaced at the next daily preparation and keeps its known spells; anyone else's needs a week of downtime.
**Reason.** Both come straight from the text above. Dead familiars keep their known spells in the record so
replacement can copy them.

### 3a. Lifecycle state machine

Spike [#2046 spike(play): familiar lifecycle, death, replacement and resurrection](https://github.com/DavidDudson/pioneer/issues/2046).
Five states: **active**, **absent**, **absorbed**, **dead**, **none** (no familiar). Replaced and released are
transitions to **none** then **active**, not states.

| From             | To       | Trigger                                                                                                    | Cost and time                                                                           | Source                                             |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| none             | active   | Gain by class, feat or dedication                                                                          | Free                                                                                    | Player Core pg. 178, 201; Player Core 2 pg. 200    |
| active           | absent   | Player marks it away from the master (**assumption**: no rule names it)                                    | None. Recall Familiar (once a day, 3 actions, within 1 mile) returns it to active.      | Player Core pg. 214                                |
| active           | absorbed | Absorb Familiar, or a Familiar Tattoo                                                                      | 1 minute (ability); 1 action, adjacent (tattoo, 60 gp). Cannot act except to turn back. | Player Core pg. 214; Impossible Magic pg. 242      |
| absent           | active   | Recall Familiar                                                                                            | Once a day, 3 actions, within 1 mile; fails beyond                                      | Player Core pg. 214                                |
| absorbed         | active   | Turn back                                                                                                  | Same activity or action                                                                 | Player Core pg. 214; Impossible Magic pg. 242      |
| active, absorbed | dead     | 0 HP (assumption), Fearsome Familiar's second return in a day, destruction of a spirit-familiar apparition | None                                                                                    | Rage of Elements pg. 22; War of Immortals pg. 23   |
| dead             | active   | Witch: next daily preparations. Others: 1 week of downtime. Resurrection: Familiar's Resurrection          | Witch free; others 1 week; spell 10 minutes, 1 HP                                       | Player Core pg. 178, 259; Impossible Magic pg. 137 |
| active           | none     | Release: gain a different familiar by Pet or Familiar Master                                               | 1 week of downtime; Familiar Master has no extra rule                                   | Player Core pg. 259; Player Core 2 pg. 200         |

**Death triggers.** Verdant Burst heals at death (Player Core pg. 130). A Familiar Tattoo loses its magic and becomes
mundane when the familiar dies (Impossible Magic pg. 242). An animist's spirit familiar costs the master every other
apparition benefit until the next daily preparations (War of Immortals pg. 23); dispersing the apparition destroys
the familiar. Specific familiars punish the master (Player Core 2 pg. 171).

**Decisions.**

1. **0 HP is death.** A familiar has no dying condition. "Slain" and "destroyed" are the same state: one `dead`.
   **Reason.** No source distinguishes them, and the Animist text uses both words for one outcome.
2. **Death triggers are rule elements on the familiar's abilities and on the master's items.** The engine emits a
   `FamiliarDied` event; elements subscribe. **Reason.** ADR-0048 style: content owns effects, engine owns timing.
3. **Prepared spells are unaffected.** They live on the master (Player Core pg. 178, Undying).
4. **Replacement keeps known spells and the form.** A new witch familiar may look different but has the same spells.
   **Reason.** The spell list is the character's data, not the creature's.
5. **Downtime replacement plugs in as a downtime activity** once [Epic 5.13: Downtime activities](https://github.com/DavidDudson/pioneer/issues/461)
   exists. Until then a manual "replace familiar" action on the sheet sets the state and logs it.
6. **Swapping to a different creature type locks Familiar's Language for 1 week** (Player Core pg. 187). The lockout
   is a dated flag on the character, cleared by the date.
7. **Healing a familiar.** Spells that target a companion or a familiar apply to it. Construct familiars are immune to
   healing, vitality and void (Player Core pg. 212, Construct). **Reason.** The spell target kind exists already.
8. **Daily preparations reset:** the day's chosen abilities (reselected), once-per-day uses (Recall Familiar), a
   witch's dead-familiar replacement and an animist's apparition manifestation. Familiar's Language, 10-minute
   frequencies and Fearsome Familiar's once-per-day return counter reset on the same cadence or on their own timer.

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

### Stories checked against the lifecycle

| Story                                                                                                      | Verdict                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [#2071 a familiar is active, absent, absorbed or dead](https://github.com/DavidDudson/pioneer/issues/2071) | Confirmed. Add `none` and keep the states above.                              |
| [#2075 replacing a living familiar by choice](https://github.com/DavidDudson/pioneer/issues/2075)          | Confirmed. 1 week of downtime, releases the old one.                          |
| [#2078 healing and resurrection of a familiar](https://github.com/DavidDudson/pioneer/issues/2078)         | Confirmed. Name Familiar's Resurrection (level 4 or lower, 1 HP, 10 minutes). |
| [#2076 daily preparations reset the familiar's uses](https://github.com/DavidDudson/pioneer/issues/2076)   | Confirmed. List in decision 8.                                                |

## The familiar on the player sheet

Spike [#2044 spike(sheet): where the familiar lives on the player sheet](https://github.com/DavidDudson/pioneer/issues/2044).
The sheet has four tabs (Plan, Encounter, Exploration, Downtime) over one header, and its sections are `fr-section`s in
the `SHEET_SECTIONS` order ([play-and-campaigns.md](play-and-campaigns.md#sheet-modes)). There is no Spells tab: spells
are a section of Encounter.

### Placement

**Decision.** A **Familiar** section in two tabs, not a tab of its own and not a drawer.

| Tab       | What the Familiar section holds                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Encounter | The card: status, Hit Points, conditions, defences, today's abilities with their uses, and Command (the action that gives 2 actions). |
| Plan      | The build: the familiar's form and name, and the day's ability slots as choices (builder stories #2051 and #2055).                    |
| Downtime  | The replace action, in Rest and preparations, once Epic 5.13 lands.                                                                   |

**Reason.** Encounter is where HP and Command matter, and a fourth tab would split the character's play across five
tabs for one creature. A drawer hides the HP of a creature the table asks about every round. The witch's spells stay in
the Spells section, marked by what the familiar knows (#2070).

### Fields and order

Name, form (species), status, Hit Points, AC, saves, Perception, skills, Speeds, senses, traits, abilities of the day
(familiar abilities, then master abilities), then items it carries. Every number reads from the derivation
(`deriveFamiliarStatistics`) and opens its breakdown the way the character's own statistics do.

### Other states

| State       | What the section shows                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No familiar | Nothing on Encounter. On Plan, an empty slot shows a prompt to choose one, only when a feat or class grants a slot.                                                                                                 |
| Active      | The full card.                                                                                                                                                                                                      |
| Absent      | The card with its status named "Absent", the numbers kept, and a Recall action while Recall Familiar is chosen.                                                                                                     |
| Absorbed    | A collapsed card: name, "Absorbed" and a turn-back action. No Hit Points row, since it cannot be hurt as a creature.                                                                                                |
| Dead        | The card with "Dead" in text, its actions off, and what happens next: a witch's "Replaced at your next daily preparations", others the downtime replace action, and Raise when Familiar's Resurrection is possible. |

Status is shown in words, never by colour or dimming alone.

### Master abilities on the master's sheet

A master ability (Familiar Focus, Restorative Familiar) is an effect on the master, so it shows on the master's own
sheet in the places the character's other effects show, with its source named "Familiar: Familiar Focus" (#2064). It
reads the familiar's status: while the familiar is not active, an ability that needs one is listed as inactive with the
reason (#2079).

### Mobile, keyboard and screen reader

- The section is a region labelled by its level 2 heading "Familiar". Status and Hit Points come right after it in
  reading order, then defences, abilities and actions.
- Statistics are a list of disclosures, one Tab stop each, as the character's statistics are.
- On a narrow screen the card's rows stack in the same order; actions sit under the status line.

### Components and strings

- `pio-familiar-card` (#2060) is presentational and lives in `libs/rules/ui` with a story for every state above
  (ADR-0028). It takes a view model of plain values and emits intents (Command, Recall, turn back, replace).
- The feature container (#2061) derives the view model from the derivation, the companion row and play state, and
  sits in `libs/character/feature`.
- Labels, status names and empty-state text are `en` message keys. The familiar's name, species and its abilities'
  names come from the character and from content.

### Stories checked against the sheet

| Story                                                                                                           | Verdict                                                                            |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [#2060 pio-familiar-card, the familiar's stat block](https://github.com/DavidDudson/pioneer/issues/2060)        | Confirmed, with a story per state in the table above.                              |
| [#2061 the sheet shows the character's familiar](https://github.com/DavidDudson/pioneer/issues/2061)            | Confirmed. Shows nothing when there is no familiar and no empty grant slot.        |
| [#2062 the familiar's abilities of the day with uses](https://github.com/DavidDudson/pioneer/issues/2062)       | Confirmed. Inside the card, not a section of its own.                              |
| [#2063 the familiar's HP, conditions and Command in play](https://github.com/DavidDudson/pioneer/issues/2063)   | Confirmed. Encounter tab only.                                                     |
| [#2064 master abilities show on the master's own sheet](https://github.com/DavidDudson/pioneer/issues/2064)     | Confirmed.                                                                         |
| [#2080 the sheet shows a dead, absent or absorbed familiar](https://github.com/DavidDudson/pioneer/issues/2080) | Confirmed. Its stories are the state stories of #2060; the container wiring stays. |
