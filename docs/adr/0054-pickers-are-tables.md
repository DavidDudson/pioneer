# 0054. Pickers are tables that open inline, searched, sorted and paged by the caller

- Status: Accepted
- Date: 2026-10-13

## Context

Frontier has two ways to pick one value from many: `fr-select`, a dropdown of labels, and `fr-combobox`, a
typed-to-filter list of labels with an optional description. The sheet and the builder now pick things that have
more to compare than a name: a spell has a rank, traditions and a cost; a feat has a level, traits and
prerequisites. A one-line label cannot show them, and a dropdown cannot be sorted by them. Both existing controls
open a popup list, and `fr-select` places it in an overlay, which the interaction rules (no modals, no popovers)
only tolerate for a short list.

Alternatives considered:

- **Grow `fr-combobox`'s options** with more fields. The listbox role has no columns, so a screen reader reads the
  fields as one run of text, and there is nothing to sort by.
- **Filter on the client when the caller gives no search.** It reads well, but the loaded rows are only part of a
  long list, so a client sort or filter would be wrong for the rest, and the choice between modes has no clean
  signal in Angular (an output cannot tell whether it has listeners).
- **Numbered pages.** They break the scroll the rest of the app uses and need a page control inside a panel.

## Decision

- **A picker is a table.** `fr-picker` shows the picked row's label on a button; opened, it is an inline panel
  in the page flow (never an overlay) with a search box over a grid. The columns are an `fr-table` schema
  (`tableSchema<Row>()…build()`), so a cell can be a component.
- **ARIA is combobox over grid** (`@angular/aria`): focus stays in the search box, the arrow keys move the highlight
  by `aria-activedescendant`, Enter on a row picks it and Enter on a header sorts by it. A row that cannot be picked
  is still reached by the arrow keys and says why, so the reason is read out.
- **The caller owns the rows.** Search and sort are always on the source: `searched` and `sorted` go out, `rows` and
  `loading` come back. There is no client filter or client sort, so what is shown is the same at ten rows and at ten
  thousand.
- **The list loads as it scrolls.** `loadMore` fires once when the end of the loaded rows is near and `hasMore`;
  the caller appends and shows `loadingMore`. No pages. Rows are virtualised inside the panel, with a sticky header,
  and a narrow screen scrolls the table inside the panel, not the page.
- **Features pick with `fr-picker`, never `fr-select`.** A short fixed list is a picker whose caller holds all the
  rows and filters them in the page. `fr-select` and `fr-select-field` stay in frontier for a future short list, but
  no feature or ui library uses them; a lint rule bans them outside `libs/frontier`, so features do not drift back.
- **`fr-combobox` stays for the content search** (the shell's global search and the sheet's side panel). Those are
  typed searches for a name, not a pick from a table to compare: a dropdown list suits them. Its options carry `tags`
  (the kind, the level, the traits) so a result says what it is. `fr-combobox-field` is removed.

## Consequences

- A feature picks a row by writing a schema and a query, not by mapping rows to `{ value, label }` options.
- Every picker needs a source that can search, sort and slice. A short, fixed list pays a small filter function for
  that.
- One control for features to learn, test and keep accessible (forced colours, touch targets, the grid role).
  `fr-select` stays maintained with no feature callers.
- `fr-picker` is in `@pioneer/frontier/data`, since it needs TanStack Table and Virtual.
