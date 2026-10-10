# 0027. Equipment facets compare printed price in copper and Bulk in tenths

- Status: Proposed
- Date: 2026-10-10

## Context

Story #284 filters equipment by price and Bulk as `range` facets. A range facet's values and URL bounds are whole
numbers (`facet.ts`), but neither field is one. A price is coins ("3 gp 5 sp") and may be for a batch ("1 sp for
10" arrows). Bulk is negligible, light (a tenth of 1 Bulk) or a whole count, and negligible and light have to order
below 1. Alternatives for price were the printed price or the price of one item; for Bulk, ordinal ranks
(negligible 0, light 1, n Bulk n + 1), decimal bounds, or a `set` facet with no "up to" bound. The equipment facet
set is also shared by every equipment kind, so facets such as weapon group are listed for armour too.

## Decision

- Price compares in copper (1 pp = 1,000 cp, 1 gp = 100, 1 sp = 10), over the price as printed: a batch's price is
  the batch's. An item with no price is unknown.
- Bulk compares in tenths: negligible 0, light 1, n Bulk 10n. A kit, which has no Bulk of its own, is unknown.
- A facet definition can carry `scale`, the stored values per unit shown (10 for Bulk), so a UI shows 0.1 and 1.
  It is for display only: URL bounds stay in the stored unit (`f.bulk=..10` is up to 1 Bulk).
- A facet definition can carry `appliesTo`, the kinds it reads when it reads only some of the kinds it is listed
  for (weapon group, armour category, damage type), so a UI can hide it when the list holds none of them. It is
  advisory: the facet still gives other kinds no value.

## Consequences

- A batch sorts by what it costs to buy: 10 arrows at 1 sp sit above a 5 cp item that costs more each. Per-item
  price would round sub-copper items to 0 and differ from the price the list shows.
- Tenths keep the rules' arithmetic (10 light items are 1 Bulk) and leave room for any Bulk, at the cost of URL
  bounds in a unit no one reads; a filter panel (#291) writes them, so people rarely type them.
- A hand-written link in the units shown (`f.bulk=..1`) means "light or less", not "up to 1 Bulk".
