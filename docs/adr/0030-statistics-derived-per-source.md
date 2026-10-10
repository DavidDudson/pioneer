# 0030. Statistics derived per weapon and spellcasting entry

- Status: Proposed
- Date: 2026-10-10
- Amends: [0016](0016-formula-reference-vocabulary.md) (reference scopes, and what a statistic's base may read)

## Context

Most statistics exist once per character: AC, the saves, the skills. Strikes and spellcasting do not. A character
has one Strike per weapon they wield, each with its own attack modifier, and one spell attack modifier and spell DC
per spellcasting entry. The core rules pack should define them as data like the others (rules-engine.md, "Statistics
are content"), so the engine needs a way to derive one statistic many times, and their base formulas need to read
the weapon or entry: its proficiency category or tradition, its attribute, a weapon's item bonus.

Options for the definition:

1. Pack authors write one statistic per weapon or entry. Content cannot know the character's weapons, so this does
   not work for anything but fixed homebrew.
2. The engine creates Strikes and spellcasting statistics in code. It works, but they stop being content, and a
   homebrew statistic derived per weapon (a "Disarm DC" per weapon) needs an engine change.
3. A statistic declares `per: weapon` or `per: spellcasting`, and the engine derives one instance per source.

Options for the references:

1. Reuse `@item.*`, the item a rule element is on. A weapon is an item, but a spellcasting entry is not one in
   Pioneer, and rule elements on a weapon would read different values than a Strike over the same weapon.
2. New scopes, one per kind of source: `@weapon.attr`, `@weapon.prof`, `@weapon.potency`, `@spellcasting.attr`,
   `@spellcasting.prof`. A statistic may read the scope of its own `per` only.

A spell DC is built on its entry's spell attack (`10 + @stat.spell-attack...`), so a statistic derived per source
also needs to read its sibling for the same source.

## Decision

Option 3 for the definition, option 2 for the references.

- `StatisticDefinition.per` is `weapon` or `spellcasting`. Its selector names the family (`strike`); each instance
  is `<selector>:<source slug>` (`strike:longsword`, `spell-dc:arcane`), so modifiers, set overrides and `@stat` find
  an instance as they find any statistic. Sources come from `StatisticInputs`: `weapons` (slug, category, traits,
  range, potency) and `spellcasting` (slug, tradition, attribute), slugs unique within each list. A family's
  selector is at most 63 characters and a slug at most 64, so an instance's selector always fits the 128 a selector
  allows. Where an instance and a plain statistic share a selector, the one given later wins.
- Each instance takes its key attribute from its source and joins that attribute's `<attribute>-based` domain, since
  the family cannot list it: a finesse dagger is `dex-based` for a nimble character and `str-based` for a strong one.
  A family therefore names no `keyAttribute`; one that does is a validation issue.
- ADR-0016's scopes were actor and item, and a statistic's base read actor references only. This adds the scopes
  `weapon` and `spellcasting`. A statistic's base may read actor references and the
  scope of its `per`; a rule element reads actor and item references only. `@weapon.attr` follows Player Core
  ("Attack Rolls"): Dexterity at range, the higher of Strength and Dexterity with finesse, else Strength.
  `@weapon.prof` and `@spellcasting.prof` read the bonus for `attack:<category>` and `spellcasting:<tradition>`.
  Foundry has no spellings for these; `actor.system.proficiencies.traditions.<tradition>.rank` translates to
  `@rank.spellcasting.<tradition>`.
- Inside an instance, `@stat.<family>` naming another family derived per the same kind of source reads that
  family's instance for the same source. A spell DC writes `10 + @stat.spell-attack` and each entry's DC reads its
  own entry's spell attack base.

## Consequences

- Strikes, spell attacks and spell DCs are core rules pack data, and homebrew can add statistics derived per weapon
  or entry without engine changes.
- Removing a weapon or entry removes its statistics; with none, a family has no instances.
- `@stat.<selector>` has a second reading inside instances. A plain statistic whose selector matches a family is
  replaced by a later definition of that selector before instances are made, so the two never coexist.
- The weapon's item bonus is a base term (`@weapon.potency`), not a typed modifier, so another item bonus to attack
  rolls (a mutagen's) stacks with it where PF2e says only the higher applies. Moving it to a synthetic `item`
  modifier is left for the story that adds runes and Automatic Bonus Progression.
- One Strike per weapon: a thrown melee weapon's thrown Strike, the multiple attack penalty and damage are out of
  scope here.
