# 0024. Book titles are message keys; the book registry holds published books only

- Status: Proposed
- Date: 2026-10-10

## Context

Story #313 adds the book registry that source references resolve against (ADR-0005). Each book needs a title that
is shown in every locale: on the Legal page, in the source line on every entry, and as a facet value in the content
browser. Two ways to store it were considered:

- **Content text** (ADR-0009): the title is a `name` field in per-locale text bundles and `content_entry_texts`,
  like an entry's name, so data can add a book without a code change.
- **Message keys**: the title is a UI message key in `rules/sdk`'s `en` bundle, mapped from `BookId` in code, and the
  registry rejects a book without one.

## Decision

Book titles are message keys. `BOOK_TITLES` in `libs/rules/sdk/src/book.ts` maps each `BookId` to
`rules.book.title.*`, and `Books` rejects a registered book that has no entry. Publishers and licences have label
keys the same way.

The registry lists published books only, starting with the remaster books Pioneer imports (Player Core, GM Core,
Monster Core, Player Core 2). Homebrew is never a registered book: a homebrew entry cites its pack and author
through a `homebrew` source (ADR-0005), so homebrew authoring never needs a registry change. OGL is left out of
`ContentLicense` until a legacy book is imported.

## Consequences

- Book titles are translated with the rest of the UI and are available as soon as the route's `rules` scope loads.
  The Legal page, source lines and facet labels don't wait for a content text bundle.
- Adding a book is a reviewed code change: one `books.json` row, one `BOOK_TITLES` entry and one `en` key. Books are
  few and change only when a book is imported, so this is the same PR as the import.
- Epic 2.3 (#18) seeds `content_books` from the registry without a title column; the title stays a key.
- If books ever have to be added as data (for example third-party publishers through the app), this is superseded
  by moving titles into content text.
