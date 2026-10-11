# 0033. Entry slugs name their kind

- Status: Proposed
- Date: 2026-10-11
- Amends: [0003](0003-content-as-data-imported-from-foundry.md) (the id scheme: `<pack>/<slug>` stands, the slug
  changes shape)

## Context

An entry's id is UUIDv5 of `<pack>/<slug>`, whatever its kind, so entries of different kinds that share a name share
an id. They do, often: Foundry pf2e has 52 languages named like ancestry traits (`goblin`, `kitsune`, `tengu`), traits
named like ancestries and classes (`dwarf`, `fighter`), the Fly spell and the Fly action, the fire trait and fire
damage. The importer worked round it with per-case suffixes (`fly-spell`, `fire-damage-type`) chosen by a type
precedence, so a slug's shape depended on what else was in the pack, and a trait, which entries name by its slug,
could not be suffixed at all.

Alternatives: put the kind into the id but not the slug (UUIDv5 of `<pack>/<kind>:<slug>`), which keeps slugs as
Foundry spells them but leaves slugs ambiguous wherever they are shown or typed; suffix only on a clash, as before.

## Decision

- Every entry's slug is its kind and its name within the kind, `<kind>:<name>`: `ancestry:dwarf`, `trait:dwarf`,
  `language:goblin`, `spell:fly`, `action:fly`. Every kind is named the same way. `EntrySlug` in the SDK is the type;
  `ContentEntry` checks the kind part is the entry's `kind`.
- Ids stay UUIDv5 of `<pack>/<slug>`, now of the whole entry slug, so they are unique per pack, kind and name.
- References to a trait stay the trait's name (`traits: ['goblin']`), as Foundry's roll options spell them
  (`item:trait:goblin`); the trait entry is `trait:goblin`. Roll options an entry sets name it by its name
  (`feat:shield-block`), not its whole slug.
- Every committed id changed. The packs were rewritten in one change, and migration `0012_kind_prefixed_slugs` maps
  the ancestry ids stored on characters to the new ones.

## Consequences

- No slug depends on what else a pack holds; the importer's suffix rules and type precedence are gone.
- Two entries of one kind and name in one pack still collide and are reported.
- The rules playground keeps its typed short names (`bravery`), since its picks syntax reads a colon; its ids are
  internal to it.
