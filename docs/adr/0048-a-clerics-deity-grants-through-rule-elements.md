# 0048. A cleric's deity grants through rule elements

- Status: Proposed
- Date: 2026-10-12

## Context

ADR-0046 put the deity on the character and left in the backlog what a cleric's deity grants (#598): training in a
divine skill and the favoured weapon, the deity's spells on the cleric's list, the holy or unholy trait its
sanctification gives, and a fist Strike when the deity favours the fist.

Foundry pf2e spreads these over several places:

- **Divine skill.** Nothing automates it. The deity's skills sit in the actor's data, and the player trains one by
  hand. Shelyn is the one deity in Divine Mysteries with two, of which a cleric picks one.
- **Favoured weapon.** Deity (Cleric) has an `ActiveEffectLike` upgrading `flags.system.favoredWeaponRank` to 1; a
  warpriest's doctrines and the creeds raise it. `DeityPF2e.setFavoredWeaponRank` then raises the proficiency of each
  favoured weapon's base (`weapon-base-scimitar`) to that rank.
- **Deity spells.** Foundry lists them on the deity; the player adds them to the entry by hand.
- **Sanctification trait.** An `ActorTraits` element per trait, predicated on the sanctification picked. Versatile
  heritages and other entries use the same element.
- **Fist.** A `Strike` element in its `fist` form, a 1d4 bludgeoning unarmed attack (agile, finesse, nonlethal) of the
  `fist` base, predicated on `deity:primary:favored-weapon:fist`.

Pioneer had no character traits, no Strike element and no per-base weapon proficiency, and its sheet listed no Strikes.

Alternatives:

- **A divine skill per deity, trained without a choice.** Wrong for Shelyn, and a choice like the font's keeps one
  shape for every deity.
- **Per-base proficiency selectors (`attack:base:scimitar`)**, as Foundry keeps them. The deity's weapons change with the
  deity, so every raise of the favoured weapon rank would need a selector per base; one selector the favoured weapons
  read is the rank Foundry stores, under a name.
- **Deity spells as a `PoolSpells`-like list on Deity (Cleric).** The spells depend on the deity picked, which a
  feature's data cannot name.

## Decision

- **Divine skill.** A deity on a character sets `deity:primary:skill:<skill>` for each divine skill, beside what
  ADR-0046 has it set. Deity (Cleric) gets a `ChoiceSet` (`divine-skill`) offering each of the sixteen skills while the
  deity has it, and a `Proficiency` per skill raising it to trained while picked. Like Divine Font, the choice is made
  even when it offers one skill, as Foundry never answers a choice by itself. A skill trained twice adds a trained
  skill slot, as any other duplicate does.
- **Favoured weapon.** A `Proficiency` element raising `attack:favored-weapon` stands for Foundry's
  `favoredWeaponRank` upgrade, and the importer translates the upgrade so. A held weapon whose base the deity favours
  (`deity:primary:favored-weapon:<base>`) is marked favoured, and its Strike reads the better of its category's rank
  and `attack:favored-weapon`. The backlog's six upgrades (Deity (Cleric), the warpriest and cloistered doctrines, the
  creeds) are spliced into the packs.
- **Deity spells.** A Pioneer element, `DeitySpells { entry }`, names the entry the deity's spells join. The deity's
  `GrantEntry` carries its spells, and an entry a `DeitySpells` element in play names offers each in its own slots of
  the rank the deity grants it at or higher, heightened, whatever its tradition and needing no access. Deity (Cleric)
  gets one for `cleric`, predicated on `class:cleric`.
- **Traits.** `ActorTraits { add, remove }` keeps Foundry's schema. A character's traits are its ancestry's, with each
  trait an element in play adds and without each one removes, and each sets `self:trait:<trait>`. The backlog's
  `ActorTraits` are spliced into the packs, but for one whose predicate reads `{item|level}` and the familiar abilities',
  which Foundry applies to the familiar, not the character, and which wait for familiars. The build summary names the
  traits by the trait vocabulary, which the character pages now load.
- **Fist.** `Strike` is read in its `fist` form only: `{ fist: true }` with a predicate. Each character with one in play
  has one fist Strike, an unarmed weapon of the `fist` base, so the favoured weapon rank reaches it. The backlog's two
  (Deity (Cleric), Iron Fists) are spliced in. The sheet gets a Strikes section listing each held weapon's Strike, then
  the fist.

## Consequences

- An uncommon favoured weapon needs no access: nothing in Pioneer restricts an uncommon item yet.
- A character without a fist `Strike` has no fist on the sheet, though every character can Strike with one. The basic
  unarmed attack, `Strike`'s other forms, the multiple attack penalty and Strike damage stay with #481.
- `self:trait:<trait>` is set from the ancestry and `ActorTraits` only. A heritage's or class's own traits, and the
  mode of being Foundry derives from `construct` and `undead`, are not.
- A removal wins over every addition, whatever their order, where Foundry applies them by priority.
- Foundry's sanctification `ChoiceSet` guard and the deity's `ChoiceSet` and `GrantItem` are not in Pioneer's rules
  nor its backlog: ADR-0046 dropped them, as the root slot replaces them.
