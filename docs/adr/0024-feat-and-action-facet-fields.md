# 0024. Feats and actions store the skills, archetype and variable cost their facets read

- Status: Proposed
- Date: 2026-10-10

## Context

Story #283 filters feats by category, action cost, archetype and skill, and actions by cost, mode and skill. Kind
`data` follows what Foundry pf2e stores ([content-model.md](../architecture/content-model.md#rules-core-data)),
and Foundry stores none of three of these: an action's cost is one glyph with no range, a feat names its skill only
in prerequisite text ("trained in Athletics") and its archetype only through traits, and no action names the skill
it uses. Deriving each at filter time was the alternative: skills parsed from prerequisites, the archetype from
traits or from the archetype entry whose `dedication` it is. Prerequisite text is English and often names no skill
at all (Assurance's is chosen), and archetype feats past the dedication carry no trait naming their archetype.

## Decision

- `ActionData` gains `upTo`, the most actions a variable cost runs to, and `skills`, the skills it uses by
  selector (`skill:athletics`). `FeatData` gains `skills` and `archetype`, the `archetype` entry it belongs to.
  All are optional.
- `upTo` is a count from 2 to 6, not a glyph as on a spell's casting time (ADR-0021): an activity can span two
  turns, past the three-action glyph.
- The action cost facet gives a variable cost the single value `variable`, not each count it spans as a spell's
  cast-actions facet does: counts above three have no glyph to pick.

## Consequences

- The importer fills these fields: `upTo` from Foundry's description ("[one-action] to [three-actions]"),
  `skills` from prerequisites and the skill each action is listed under, `archetype` from the archetype entry
  whose dedication the feat is or requires. A field it can't fill is left out and the coverage report lists the
  entry; the facets count a skill feat or `archetype`-trait feat without one as Unknown.
- A feat's archetype is linked both ways, `ArchetypeData.dedication` and `FeatData.archetype`, and nothing yet
  checks that the two agree. A pack-level check belongs with the importer.
- A variable cost reads as a count on actions and as a glyph on spells. The Foundry export (ADR-0018) writes each
  back its own way.
- An archetype value is the archetype's `ContentId`, not a readable slug. A filter panel labels it with the
  archetype entry's name from the content bundle (#291); the playground shows the id.
- Picking "2 actions" keeps a spell cast with one to three actions but not an action that costs one to three;
  picking "variable" finds those.
