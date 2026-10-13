# 0051. A spell's damage may read the spellcasting entry that casts it

- Status: Proposed
- Date: 2026-10-13
- Amends: [0030](0030-statistics-derived-per-source.md) (what may read the `spellcasting` scope)

## Context

Foundry marks a spell damage part that adds the caster's spellcasting attribute modifier with `applyMod`. No spell
in Player Core or Divine Mysteries sets it, but later books and homebrew do (#544). ADR-0030 added the
`spellcasting` scope for statistics derived `per: spellcasting`, and keeps rule elements to actor and item
references; content damage formulas read actor and item references only.

Options:

1. A boolean `applyMod` on the part, which the engine reads and adds the modifier for. Every consumer of a damage
   formula has to know the flag, and the formula alone no longer says what is rolled.
2. Add `@spellcasting.attr` to the end of the part's formula, and let a spell's damage formulas read the `spellcasting`
   scope. The formula says what is rolled, and the reference already exists (ADR-0030).

## Decision

Option 2. A spell's damage parts are a `SpellDamageFormula`: a damage formula that may read actor, item and
spellcasting references. `@spellcasting.attr` there is the attribute modifier of the entry the spell is cast from.
The importer maps `applyMod: true` to `+ @spellcasting.attr` at the end of the part's formula. Every other damage
formula (weapons, consumables, effects, heightening increments) keeps actor and item references only.

## Consequences

- The engine binds a spell's damage to the entry casting it when it rolls, as it binds a statistic
  derived per entry.
- `@spellcasting.attr` has no Foundry spelling (ADR-0030). The exporter (Epic 8.3) maps a trailing
  `+ @spellcasting.attr` term back to `applyMod: true` and reports any other use of the reference as
  untranslatable, as ADR-0016 does for Pioneer-only paths.
- A hand-edited formula that reads the entry elsewhere (`@spellcasting.attr + 1d4`) is valid content but does not
  export.
