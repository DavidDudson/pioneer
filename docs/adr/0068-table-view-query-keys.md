# 0068. A table view's query keys are single letters

- Status: Proposed
- Date: 2026-10-17

## Context

A table's view (sort, filters, visible columns, page size, search text) is shared as a link and reopens identical
(#949). The link must stay short enough to paste, and it outlives the code that wrote it: a bookmark made today is opened
after columns are renamed and facets added. The facet filters already had a URL form, one `f.<facet id>` param per facet
(`filterToQuery` in `rules/sdk`).

Alternatives:

- **One param per part, descriptive names** (`sort`, `hidden`, `pageSize`). Readable, and about three times longer for
  the same view.
- **One opaque blob** (base64 of JSON). Shortest for large views, unreadable, and breaks on every shape change.
- **Column ids in the URL.** Ids are internal and renamed; a link would die with the rename.

## Decision

- A view is five params: `s` sort, `f` facets, `c` columns, `n` page size, `q` search text. The keys are fixed by this
  ADR; adding a part takes a new key, and a key is never reused for another meaning.
- Columns appear as the `code` the table schema declares (`addText({ id: 'level', code: 'lvl', … })`), short and
  stable, never the id. A column without a code stays out of shared views.
- `s` is the codes in order, `-` for descending: `s=-lvl,name`. `c` lists only the columns that differ from the table's
  defaults, in schema order: `-src` hides a column shown by default and `~bk` shows one hidden by default, so a table's
  default view is no `c`.
- Defaults are omitted: a view at its defaults has no params at all, and one view always gives one URL.
- `f` is opaque to the codec. frontier knows no schemas (ADR-0028), so the page runs its own facet codec and hands the
  text in through a `FacetTextCodec`. The codec is not a second encoding of the filters.
- Reading never fails. Unknown codes, repeated columns, a page size that is not a whole number above zero and params
  that are not text are dropped, so an old or hand-edited link still opens.
- Typing a search replaces the history entry; every other change pushes one, so Back undoes a filter and a sort but
  not each keystroke.

## Consequences

- A typical view (a few sorts, a few columns toggled, a short search) encodes in under 200 characters.
- Renaming a column id is safe; changing a column's `code` breaks the links that name it.
- The page that owns the facets owns the format of `f`. The content browser writes one `f` segment,
  `traits:fire~level:..5`, in place of its `f.<facet id>` params;
  links in the old form stop narrowing, as an unknown param does.
- `+` is not a mark: a query string reads it back as a space. The mark for a shown column is `~`, which is never escaped.

## Amendment: a signed-in user's stored columns

A table that names an entity keeps the signed-in user's visible columns and density on their account
(`user_table_views`, one document per user and entity). The columns follow, in order, the URL's `c`, then what the
account stored, then the table's defaults. A link that carries no `c` therefore opens the recipient's stored columns,
not the defaults; the sender who needs the defaults to reproduce shares a link with a `c`. A signed-out visitor, or a
table with no entity, sees the URL and the defaults as before.

- The account keeps the visible column ids, so a column added to the schema after a view was stored starts hidden for
  that user until they show it.
- A stored list that names no column of the table's current schema (another kind of the table) is ignored, and a
  change keeps the ids this schema does not know.
- Density is never part of a link.
