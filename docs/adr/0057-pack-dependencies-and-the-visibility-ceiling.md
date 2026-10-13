# 0057. A pack is no more visible than the packs it extends

- Status: Accepted
- Date: 2026-10-14

## Context

A homebrew pack can extend other packs, official or homebrew, such as a pack of feats that names Player Core's classes
(`content_pack_deps`). Its entries may reference anything in the packs it extends and nothing else. That holds up only
if three things do:

- the graph has no cycles, or no load order exists;
- a reader who can open a pack can resolve its references, so the pack is never visible to more people than a pack it
  extends (ADR-0007, ADR-0055);
- a dependency is not removed while entries still reference it.

Dependencies change from two places, adding one and changing a pack's visibility, and the checks must hold when both
run at once.

## Decision

- **The graph is pure code in `libs/rules/sdk`** (`wouldCycle`, `reaches`, `loadOrder`), so homebrew can refuse a cycle
  and the content tables can load in dependency order without either importing the other. `loadOrder` puts a pack after
  everything it extends, breaking ties by pack id, so it is the same order on every run.
- **Visibility is ordered `private`, `campaign`, `public`** (`isWiderThan`). A pack may not be wider than any pack it
  extends. Official packs are public. Adding a dependency is refused when the pack is wider (409). Widening a pack
  past one it extends is refused naming those packs. Narrowing a pack under one that extends it is refused with a
  count, not names: its owner may not be allowed to read the others.
- **Readable only.** A dependency must be readable by the actor (`PackAccessPolicy`, now over any pack, official ones
  too). A pack that is not is a 404, so a private pack's id reveals nothing. The dependencies list leaves out ones the
  viewer cannot read.
- **Removal is refused while entries reference the dependency** (409, naming the entries). An entry references another
  by its `ContentId` wherever it appears in its data, so `DependencyUsageDirectory` finds the entries whose data holds
  an id of the dependency's entries. Homebrew has no entry editor yet, so for now nothing can hold one.
- **The checks run under lock.** `PackDependencyRepository.add(actor, edge, whileLocked)` takes a transaction advisory
  lock on the graph, then both `content_packs` rows `FOR UPDATE` in id order, and only then runs the cycle and
  visibility checks. `updateVisibility` locks its own row, as ADR-0055 describes, and so waits for an addition that
  touches it. Two additions cannot each pass a cycle check and close one together, and a widening cannot race an
  addition.
- **The registry loads a pack's closure in dependency order.** `ContentRepository.loadWithDependencies` reads the edges
  and the packs of `loadOrder` in one snapshot, and `StoredContentSource.registryWithDependencies` registers them in
  that order, so the slug-order registration in content-model.md still holds within each pack. It is built on each ask,
  not cached: a homebrew pack changes without any official hash changing.

## Consequences

- Enabling a pack in a campaign (its own story) pulls in the closure `loadOrder` returns, and applies the same rules.
- The pack-delete story must handle `content_pack_deps.depends_on`, which has no cascade: a pack others extend cannot
  be deleted until they stop.
- The dependencies response carries `editable`, the one viewer-relative field the pack contract has so far, so a
  reader is not shown controls the server would refuse. Revisit with the one ADR-0055 notes.
- The cycle check reads every edge. That is fine at the volume of homebrew packs; revisit if one pack's closure grows
  large.
