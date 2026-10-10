# 0028. Frontier knows no schemas; rules-aware UI splits into presentational and container components

- Status: Proposed
- Date: 2026-10-10

## Context

Frontier (`libs/frontier`) is the design system: layout, controls, text, feedback. It has its own Storybook, and
its stories run as tests with axe in every theme and colour mode. Components that render rules data (rich text, and
next the source line from #315) live in `libs/rules/ui`. That library had no Storybook, and nothing says where such
components go or how much they may do. A component that renders a `SourceRef` while also looking up the author,
loading the pack or running the engine can only be shown or tested with a live backend.

## Decision

- **Frontier knows nothing about Pioneer's schemas.** It never imports `rules/*` or another domain library, and its
  stories never show content entries, source references or engine output. A component that needs a schema type is
  a Pioneer component, not a frontier one.
- **Pioneer components that render rules data come in two kinds:**
  - **Presentational** (dumb): in a `type:ui` library (`libs/rules/ui`, later `libs/<scope>/ui`). They take
    resolved data through inputs, such as an entry's `sources` and a map of author display names, and are built
    from frontier components. They may inject Transloco and `LocaleFormat`, but no store, query, HTTP client or
    engine call.
  - **Container** (smart): in a `feature` library. They load or derive data (queries, stores, the engine) and pass
    it to presentational components.
- **Every presentational component has a story** in its library's own Storybook. Each such library has a
  `.storybook` built on the shared preview (`@pioneer/frontier/storybook`) and the shared theme × colour mode test
  projects (`libs/frontier/.storybook/theme-projects.ts`), so its stories run as tests with axe exactly like frontier's.
- **One Pioneer Storybook composes them.** `apps/storybook` has an introduction page and composes each library's
  Storybook through `refs`: local ports in development (`nx storybook storybook` starts them all), and the
  libraries' static builds copied in beside it for a static build.

## Consequences

- A presentational component can be shown and tested in every state from plain data, with no backend or fixture
  pack. Containers stay thin, and their specs only check the wiring.
- A new `ui` library needs a `.storybook` folder (main, preview, vitest config and setup, tsconfig), a port in its
  `project.json`, and an entry in the composer's list in `apps/storybook/.storybook/main.ts`. `ci:storybook` runs
  every library's `test-storybook`, so CI picks it up without a change.
- Every library's Storybook runs in each CI Storybook job, so job times grow with the story count. Split the matrix
  by library when that matters.
- Frontier's `@pioneer/frontier/storybook` entry and `.storybook/theme-projects.ts` are shared Storybook setup, not
  product code: they have no schema imports and ship in no bundle.
