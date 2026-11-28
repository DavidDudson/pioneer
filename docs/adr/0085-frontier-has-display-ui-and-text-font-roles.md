# 0085. Frontier has display, UI and text font roles

- Status: Proposed
- Date: 2026-11-28

## Context

Frontier set every word in one face: `--fr-font-display` was an alias of the body face. Rules prose, headings,
controls and tables want different things from a typeface. Long prose wants a text serif, controls and dense tables a
legible sans with good figures, and page titles a face with character. The player's body-font choice (`thematic`,
`readable`, `lexend`, `opendyslexic`, `system`) exists for legibility and must keep winning where text is read.

## Decision

1. **Three roles in `fonts.css`**: `--fr-font-display` (page titles, section headings), `--fr-font-ui` (controls,
   labels, tables) and `--fr-font-text` (long rules prose and the page default). `--fr-font-mono` and `--fr-font-brand`
   are unchanged, and `font-display`, `font-ui`, `font-text` are Tailwind utilities.
2. **Default faces**: display Fraunces, UI Atkinson Hyperlegible Next, text Crimson Pro.
3. **The body choice overrides UI and text together.** `readable` sets text to Atkinson Hyperlegible Next, `lexend` and
   `opendyslexic` set both to their face, and `system` sets all three roles to the device's sans. The display face stays
   Fraunces for every choice but `system`: titles are short and large, so they do not carry the legibility cost the
   accessibility faces answer.
4. **`FontStylesheets` asks for every Google family in one `css2` request** (families sorted by name, as the API
   requires), plus the wordmark's own request, whose `text=Pioneer` subset cannot be shared. OpenDyslexic still comes
   from Fontsource. For every choice but one the request count is at most what it was before the roles; OpenDyslexic
   with the device monospace face costs one more (four, not three), because Fraunces then has no Google request to
   share.
5. **`tools/font-roles.test.ts` checks the roles for every body × mono combination**: each resolves, starts with the
   intended face and ends in a generic family.

## Consequences

- Headings and `title`/`display` text change to Fraunces in this change; the rest of the app waits for the variants
  and controls to pick a role.
- Fraunces is a variable face with an optical-size axis, loaded at weights 400 to 700 without italics.
- A new face means a line in `fonts.css`, one in the loader's family table, and a row in the font-roles test.
