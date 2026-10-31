# frontier: agent guide

frontier is Pioneer's design system and the **only** place Tailwind exists.
Read this before touching any UI.

## Rules

- **frontier knows no Pioneer schemas** (ADR-0028). It never imports
  `rules/*` or a domain library. A component that renders content, a
  source reference or engine output is a presentational component in a
  `ui` library (`libs/rules/ui`), built from frontier components, with its
  story in that library's Storybook.
- **Apps and features never style.** Outside `libs/frontier`, templates may
  not use `class`, `[class]`, `[ngClass]`, `style`, `[style]` or `[ngStyle]`,
  and components may not have `styleUrl`/`styles`. Lint enforces it. If a
  layout can't be built from frontier components, add a component or an
  input to frontier.
- **No raw HTML outside frontier.** Feature and app templates contain only
  components: `fr-*`, `pio-*`, and `ng-container` / `ng-template` /
  `ng-content` / `router-outlet`. No `<div>`, `<p>`, `<h2>`, `<button>`,
  `<input>`, `<a>`, `<form>`: use `fr-stack`, `fr-text element="p"`,
  `fr-heading`, `fr-button`, `fr-text-input`, `fr-link`, `fr-form`
  (`pioneer/no-native-elements`).
- **One owner per native element.** Inside frontier, each element with
  behaviour or semantics is rendered by exactly one primitive, and everything
  else composes that primitive: `<button>` only in `fr-button` (and the
  select trigger), `<input>` only in the plain controls, `<a>` only in
  `fr-link`, `<label>` only in `fr-label`, `<form>` only in `fr-form` /
  `fr-async-form`, `<h1>`–`<h4>` only in `fr-heading`, `<p>`, `<pre>`,
  `<code>`, `<kbd>`, `<abbr>`, `<q>`, `<em>` and `<strong>` only in `fr-text`, `<blockquote>` only in
  `fr-quote`, `<ul>` / `<ol>` only in `fr-list` (whose `fr-list-item` hosts are
  the items, `role="listitem"`), table elements only in `fr-table`, `<svg>` only in `fr-icon`,
  `<textarea>` only in `fr-text-area`, `<details>` / `<summary>` only in
  `fr-disclosure`, `<hr>` only in `fr-divider`, `<img>` only in `fr-image`, `<meter>` only in `fr-meter`.
  `<li>`, `<dl>`, `<dt>` and `<dd>` are banned: rendered inside a component
  they leave its host between list and item (`fr-description-list` uses
  list, term and definition roles instead). Elements with no owner yet
  (`cite`, `fieldset`, `progress`, …) fail lint:
  add a primitive first. `<select>` is banned for good (`fr-select` builds on
  `@angular/aria`); `<dialog>` is owned by `fr-drawer` alone (the one modal). Only `div`, `span` and the landmark and sectioning
  elements are free; any element missing from the ownership map
  (`tools/eslint/no-native-elements.ts`) fails, so classify it there first.
- **Tokens only.** Components take token names (`gap="md"`, `tone="muted"`),
  never lengths or colours. Inside frontier, only semantic utilities exist:
  the default Tailwind palette, spacing, type, radius, shadow, duration,
  opacity, z-index and animation scales are wiped in
  `src/styles/frontier.css`.
- **Sharp and flat.** No rounded corners and no shadows, in any theme:
  there are no radius or shadow tokens, `rounded-*` / `shadow-*` /
  `ring-*` / `drop-shadow-*` / `text-shadow-*` are banned
  (`pioneer/class-tokens`), the base layer squares off native controls, and
  the built-CSS check fails on any radius or shadow. Separate and elevate
  with borders (`border-line-*`, or `fr-divider` between regions) and
  surface colours instead. The one exception is `rounded-toast` on the roll toast (`fr-toast`, ADR-0074).
- **No arbitrary values, pixels or raw numbers** in class strings
  (`pioneer/class-tokens`): no `h-[2.75rem]`, `p-(--x)`, `data-[x=y]:`,
  `h-px`, `opacity-50`, `z-10`, `duration-150`, `w-1/2`, `bg-x/50` or `!`.
  Need a value? Add a semantic token (tier 2) and map it in `@theme`
  (`h-touch`, `max-h-listbox`, `w-placeholder-md`, `grid-cols-fill-md`,
  `opacity-disabled`, `z-sticky`, `duration-fast`, `pt-safe-top`). Need a
  state selector? Add a `@custom-variant` (`highlighted:`). Counts are fine
  (`grid-cols-3`, `flex-1`, `shrink-0`), as are token steps (`gap-2xs`).
- **CVA for every class.** Variants are `cva()` configs
  (class-variance-authority) whose maps are literal strings, so Tailwind's
  scanner sees them. Class strings live only in `cva()` / `cx()` calls, a
  component's `host.class`, or a `{…} satisfies Record<Token, string>` map
  (shared maps are in `tokens.ts`: `gapVariants`, `paddingVariants`,
  `toneVariants`); lint checks exactly those. Frontier templates never hold
  class strings: they bind `[class]` to a cva result
  (`pioneer/no-template-styling`). Customisation is a new variant, never a
  class passed in. Never build a class name by concatenation (`'gap-' + gap`).
- **Icons are Lucide, through `fr-icon`.** Pass the icon class
  (`import { LucideCheck } from '@lucide/angular'`, `[icon]="Check"`), never
  a name string, so unused icons tree-shake. No other icon sets, no unicode
  glyphs (`✓`, `▲`) and no hand-drawn SVG. Lines are always 1px at every
  size (`nonScalingStroke`); there is no stroke-width input. Size is a token
  (`sm|md|lg`), colour follows the text unless `tone` is set. Icons are
  decorative unless given a `label`; an icon-only button labels the button.
  A rules symbol with no Lucide icon (a PF2e action glyph) is text, not an
  icon: `fr-glyph` shows it hidden from screen readers and reads out its
  `label`.
- **Small parts, composed.** Like Radix / Reka: a primitive owns one element
  and its variants; bigger components assemble primitives and parts, which
  find their root through DI (`fr-label` and the control inject `Field`).
  Prefer a new part over a new input that switches markup.
- **Separate files.** Every component has a `.ts` and `.html`; no inline
  templates or styles.
- **Const objects, not enums** for every variant set (`Space.Md`,
  `ButtonVariant.Primary`).
- **Logical directions only.** `ms`/`me`, `ps`/`pe`, `start`/`end`,
  `border-s`/`border-e`, `text-start`/`text-end`, so layouts flip for
  right-to-left locales. `class-tokens` rejects `ml-*`, `left-*`,
  `text-left` and the rest. Safe-area padding (`pl-safe-left`) is the
  exception: a notch sits on a physical edge.
- **Format through `LocaleFormat`.** Numbers, lists, distances and sorting use
  the active UI locale (`fr-date` and `fr-distance` already do). Never call
  `toLocaleString()` or `Intl` with the browser default. Format inside a
  `computed` so a locale switch re-renders. Rules distances are feet; show
  them with `fr-distance`, which honours the feet/metres preference.
- **Entry points.** `@pioneer/frontier` is everything the shell and forms
  need. `@pioneer/frontier/data` (Table, Chart, VirtualList, Combobox) is separate so
  their TanStack libraries load only on routes that use them: the Angular
  builder can't tree-shake unused barrel exports out of app sources.

## Interaction rules

Pioneer never interrupts the user. Lint enforces each rule
(`pioneer/no-interruptions` in templates, `pioneer/no-full-page-load`,
`pioneer/no-route-resolvers` and restricted imports/globals in TypeScript).

1. **No toasts.** Feedback appears inline, next to what caused it: a field's
   error under the field, a save's tick beside the value (`InlineEdit<T>`), a
   region's load failure in place of that region. No snackbars, no toast
   libraries, no `role="status"` popups floating over the page.
2. **No modals**, with one exception: `fr-drawer` below the `lg` container size is a full-screen `<dialog>`
   (ADR-0065). Everywhere else, no `<dialog>`, `role="dialog|alertdialog"`, CDK or
   Material dialogs, bottom sheets, or `alert`/`confirm`/`prompt`. Show the
   content inline (expand in place with `fr-disclosure`, inline edit), in the docked `fr-drawer`, or give it
   its own route. Secondary content prefers the drawer: it sits beside the page and pushes the content
   aside, never over it, and it does not trap focus (ADR-0065), except on narrow screens, where it is the exception above.
   A `popover`, tooltip or hover card is allowed
   for a transient, non-blocking description only: nothing in it is acted on. See rule 4 for when a
   confirmation is allowed at all.
3. **No full page loads. Always partial load + skeleton.**
   - Navigate with `routerLink` / `Router`. No internal `href`, no
     `location.reload|assign|replace`, no assigning `location`.
   - No route resolvers: the page renders immediately and each region fetches
     its own data.
   - Every region that waits on data shows `fr-skeleton` shaped like the
     content it replaces, not a spinner and not a blank page. `fr-page-header`
     shows a title skeleton while `title` is `undefined`.
   - After a change, refresh only the region that changed; never reload the
     page or the whole list to show one updated value.
   - `fr-spinner` is for in-place action progress only (a button's `loading`,
     an inline save), never for loading content.
4. **Avoid confirmations.** Act on the first press and make the action
   reversible instead: inline edit's Revert, an undo next to what changed, a
   restorable archive in place of a delete. Ask only before an action that is
   both destructive and irreversible (deleting a character for good), and then
   inline: a second press on the same button, never a modal. `fr-async-button`'s
   `confirmLabel` does this.

## Data entry

Preferences, not lint rules: follow them unless a case clearly needs
otherwise, and say why in the PR when you don't.

- **Avoid checkbox and radio lists.** Pick the control by how many options
  there are:
  - **On/off:** `fr-toggle-button` (`fr-toggle-button-field` in forms),
    outlined when off and filled with the accent when on. The label names
    the setting and stays the same in both states; in the field it is the
    button's text. Several independent settings are a row of toggle buttons.
  - **Several filters at once** (kind, rarity, traits): `fr-filter-chips`, a
    wrapping row of toggle buttons whose `[(value)]` is the set of selected
    keys, with a clear-all action. Never a checkbox list.
  - **One of 2-3 options:** `fr-segmented` (`fr-segmented-field` in forms),
    every option visible as a button group.
  - **One of 4 or more:** `fr-picker` (`fr-picker-field`, `/data`), a table that opens
    inline, with a search box and sortable columns. Features use it
    for every pick; `fr-select` and `fr-select-field` stay in frontier for a future short
    list, but lint bans them in features and ui libs (ADR-0054). `fr-combobox` stays only for
    the content search, a typed name lookup whose options carry `tags`.
    Columns come from `tableSchema<Row>()`; the feature runs the query from
    `(searched)`, the order from `(sorted)` and the next rows from `(loadMore)`,
    and passes the rows back. Scroll to load more, never numbered pages. A short
    fixed list is a picker whose feature filters the rows it holds.
- **No confirmation steps** in data entry: values save as they change (see
  [Inline editing](#inline-editing)) and Revert undoes them. Confirmation is
  only for destructive, irreversible actions (rule 4 above).

## Mobile first

Phones and tablets are the primary targets. Desktop is the same layout with
more room, never a separate design.

- **Container queries, never viewport breakpoints.** Layout responds to the
  space a region actually has, so the same component works full width on a
  phone and in a narrow column on desktop. Frontier has no viewport
  breakpoints (`--breakpoint-*` is wiped). Container sizes are `@sm` (24rem),
  `@md` (40rem) and `@lg` (56rem), exposed as `Container` in `tokens.ts`.
  Unprefixed classes are the narrow layout; variants only expand it.
- **Only layout primitives are responsive.** `fr-box`, `fr-grid` and
  `fr-stack` are the only components that may use container variants. Every
  other component, frontier's own included (`fr-page`, `fr-shell`, …),
  composes them and has no responsive CSS, with one exception: `fr-page-aside`
  sets its own width from the `lg` size of the `fr-stack` that `fr-page` lays
  it out in. Need new responsive behaviour? Add
  an input to a primitive. Lint (`pioneer/layout-variants`) bans viewport
  variants (`sm:`, `max-*:`, …), container variants outside the primitives,
  and container sizes other than `@sm|@md|@lg` (`@max-*`, `@[…]`). The
  built-CSS check fails on any viewport width media query.
- **The primitives.**
  - `fr-box`: a region. Query container, `width="full|prose|page"`,
    `padding`, and `gutter` (inline padding that widens with the box).
  - `fr-grid`: `[columns]` is the count once the grid is wide enough: one
    column when narrow (two for six-up), more at `@md` / `@lg` of the grid's
    own width. `minItem` is fluid at every width. `termFrom="sm|md|lg"` is
    the term/value layout: one column, then a fixed term column and a value
    column. `query="parent"` follows the nearest container around the grid
    and gives the host no box, for rows that follow an outer container's width
    (`fr-description-item`'s term and value).
  - `fr-stack`: vertical by default; `horizontalFrom="sm|md|lg"` makes it a
    row once the stack itself is that wide.
  - An element can't query its own size, so grid, box and responsive stacks
    are a container host around an inner layout element. Containers fill
    their parent's width (inline-size containment stops them shrink-wrapping
    content), so don't put one inside a horizontal flex row without a width.
- **One column of content on phone.** Nothing scrolls sideways except an
  explicit overflow region (such as a table). Don't hide content on
  phone to make it fit; reflow it.
- **Touch targets are at least 44px (2.75rem).** Buttons, controls, select
  options and inline-edit triggers meet this by default and shrink only
  under `pointer-fine:` (mouse/trackpad). New interactive components do the
  same: touch size unprefixed, compact size under `pointer-fine:`. That's an
  input-capability query, not a layout breakpoint, so any component may use
  it. Never rely on hover to reveal anything.
- **Text inputs use `text-body` (16px) or larger** so iOS doesn't zoom on
  focus.
- **Safe areas.** `fr-shell` pads for notches and home indicators via
  `env(safe-area-inset-*)`; the app's viewport meta needs
  `viewport-fit=cover`. Anything fixed to a screen edge pads the same way.
- Use `min-h-dvh`, not `100vh`, so mobile browser chrome doesn't clip pages.

## Token tiers

1. **Primitives** (`primitives.color.css`, `primitives.scale.css`): one
   OKLCH ramp per colour role (`--fr-ramp-accent-600`; roles `neutral`,
   `accent`, `danger`, `success`, `warning`, `info`), spacing/type/duration
   scales. Ramps have no colour of their own: each step is computed
   from its role's `--fr-ramp-<role>-hue` / `-chroma`, which the theme sets.
   Ramps are generated by `scripts/generate-ramps.ts`; never edit the CSS by
   hand.
2. **Semantic** (`semantic.css`): `--fr-surface-*`, `--fr-fg-*`,
   `--fr-line-*`, and per colour role (`accent|danger|success|warning|info`)
   the same set: `fg`, `line`, `subtle`, `solid`, `solid-hover`,
   `solid-active`, `on-solid`; badge fills (`--fr-<role>-emphasis` /
   `-on-emphasis`); every `on-solid` and `on-emphasis` keeps small text at
   4.5:1 on its fills in every theme and mode,
   spacing names (`3xs … 3xl`), named sizes (`--fr-size-touch`,
   `--fr-size-control-*`, …), motion, opacity, z-index, chart series.
   Colours reference ramp steps only, never a hue.
3. **Tailwind mapping** (`frontier.css` `@theme`): exposes tier 2 as
   utilities (`bg-surface-raised`, `text-fg-muted`, `gap-md`,
   `text-heading`, `border-line-subtle`). The one exception is the
   `system-*` colours: CSS system-colour keywords set directly in `@theme`,
   never in `semantic.css` or a theme, and allowed only under
   `forced-colors:` (see [Forced colours](#forced-colours)).

## Themes and colour modes

Two independent axes, both attributes on `<html>`, set by `ThemeStore`
(remembered in localStorage; `apps/web/src/index.html` applies them before
boot):

- **Mode** (`data-mode`): **dark is the default** on plain `:root`; light is
  `data-mode="light"`. Modes live only in `semantic.css` and only choose ramp
  steps, so every theme gets both modes for free.
- **Theme** (`data-theme`): a file in `src/styles/themes/`. `frontier.css`
  is the default on plain `:root` and defines every parameter; others
  override under `:root[data-theme='<name>']`. A theme sets
  each role's hue and chroma. If a theme needs a different
  mode-dependent value, scope it to
  `:root[data-theme='<name>'][data-mode='light']` or
  `…:not([data-mode='light'])` so it beats the mode block.

Adding a theme: create `themes/<name>.css`, import it in `frontier.css`
after `themes/frontier.css`, and add it to `Theme` in
`lib/theme/theme.ts`. Story tests then run axe, contrast included, on every
story in the new theme in both modes, and `bun run check:contrast` checks
every declared token pair in it.

### Token contrast

`styles/contrast-pairs.ts` lists the foreground/background token pairs
components use: `fg-*` and `*-fg` on surfaces and subtle fills,
`<role>-on-solid` on each role's solid fills in every state (fr-button),
`*-on-emphasis` on the badge fills, `line-focus` on surfaces.
`bun run check:contrast` (in `lint:workspace`, so in CI) works out each pair
from the CSS in every theme × mode, OKLCH clipped to sRGB as Chromium paints
it, and fails below the minimum. The measure is the WCAG 2 ratio, the one
axe applies: 4.5:1 for text, 3:1 for non-text such as the focus ring. APCA
is not used while it is only a WCAG 3 draft. Retune a ramp step or surface
and the check says which pairs moved; add a pair when a component puts a new
foreground on a new background. It covers pairs axe can miss: the focus
ring, and combinations no story renders. Control borders (`line-*`) are not
declared yet and do not reach 3:1. Tokens must be set in top-level
`:root[data-…]` rules; the check refuses any other placement it cannot
cascade.

### Forced colours

Under `forced-colors: active` (Windows High Contrast) the browser swaps
every colour for the user's palette, except CSS system colours, and drops
the theme. Anything shown only by a fill disappears: a borderless button's
edge, a pressed or selected state, a meter's fill, a skeleton. Components
restore it with `forced-colors:` variants:

- Use only the `system-*` colours (`bg-system-highlight`,
  `text-system-highlight-text`, `system-canvas`, `system-canvas-text`,
  `system-gray-text`). `class-tokens` rejects a theme colour under
  `forced-colors:` and a system colour anywhere else.
- Pressed and highlighted states fill with Highlight / HighlightText. Every
  button gets a border, as do base and sunken surfaces. A selected option is
  underlined. A solid badge inverts to Canvas text on a CanvasText fill, and skeletons
  are GrayText.
- Spell out the hover and active pairs of a state
  (`forced-colors:aria-pressed:hover:`): `aria-pressed:hover:` is more
  specific than `forced-colors:aria-pressed:`, and the theme colour it sets
  would be replaced with the user's background.

The `Accessibility/Forced Colours` story turns forced colours on through
CDP (`emulateForcedColors`, `testing/story-forced-colors.ts`) and checks
each state against the system colour it should resolve to
(`paintedAcross` reads a screenshot where `getComputedStyle` can't, such
as a meter's fill). The emulation is on the runner's page, so it is turned
off when the test finishes (`onTestFinished`), not in a Storybook cleanup,
which never runs after a file's last story. In Chrome
DevTools, Rendering → "Emulate CSS media feature forced-colors" shows any
story the same way.

## Fonts

Typefaces are tokens too (`styles/fonts.css`): `--fr-font-body|display|mono|brand`, with the player's choice as
`data-font-body` / `data-font-mono` on `<html>`. Display text uses the body face; only the wordmark
(`fr-text` variant `brand`) uses the brand face, which never changes. A font file is not bundled: the app loads
the chosen face's stylesheet from Google Fonts on demand (`FontStylesheets` in `@pioneer/shared/web`). Every stack
ends in a generic family. Never hard-code a family in a component; use the `font-*` utilities.

## Components

| Area           | Components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout         | Primitives `fr-box`, `fr-grid`, `fr-stack`; composed `fr-shell` (`brand`, `badge`; slots `frShellSearch`, `frShellActions`, `frShellFooter`; one row: brand and badge, the page's breadcrumbs, search, menus; owns the skip link and the only `<main>`), `fr-dropdown` (`label`, `icon` or `caption` or `custom` with `[frDropdownTrigger]`: a button that opens a non-modal panel of links and controls; closes on Escape, an outside press or a followed link), `fr-page` composed of `fr-page-header` (`title`, `description`; slots `frPageActions`, `frPageTabs`; breadcrumbs come from the active route (`data.crumb`) and show in the shell header, pages never pass them), `fr-page-body` and `fr-page-aside` (`label`: a complementary landmark beside the body from the `lg` size), `fr-surface`, `fr-section` (`anchor`, `heading`: a `<section>` region on a surface, labelled by its level 2 heading, which skip links focus); `fr-divider` (`orientation`, `tone` subtle/default/strong; vertical is decorative) |
| Disclosure     | `fr-disclosure` (expand in place; `frDisclosureSummary` takes phrasing content only, nothing interactive)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Lists          | `fr-list` (`ordered` for `<ol>`, `markers` for bullets or numbers, `gap`) with `fr-list-item`; `fr-description-list` (`gap`, `columnsFrom`) with `fr-description-item [term]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Text           | `fr-text` (`element="span\|p\|pre\|code\|kbd\|abbr\|q\|em\|strong"`, `expansion` for `abbr`), `fr-line-break` (a break that is content), `fr-glyph` (a rules symbol read out as its `label`), `fr-quote` (block quote, `attribution`), `fr-heading` (`[level]` 1-4 for the outline, `variant` for the look, `anchor` for an id that labels a region and takes focus from a skip link; see [Heading depth](#heading-depth)), `fr-badge` (`tone` neutral/accent/status, `variant` subtle/solid, `[icon]`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Actions        | `fr-button` (`(pressed)`, `iconOnly` for a square icon button), `fr-async-button`, `fr-link` (`to` routes and marks the current page with `aria-current`, `exact` for a root link; `skipTo` moves focus to an id on the page; `href` external only, `external` for a URL from data), `fr-section-index` (`label`) with `fr-section-link` (`anchor`): a `<nav>` of touch-sized skip links to a page's `fr-section`s, wrapping on phone; `fr-tabs` (`label`) with `fr-tab` (`to`, `exact`): section tabs as router links, each section its own route, never hidden panels; one Tab stop, arrow keys between tabs, scrolls sideways on phone                                                                                                                                                                                                                                                                                                                                                                                      |
| Async          | `injectAsyncAction`, `fr-async-indicator`, `fr-async-region` (+ `frAsyncPending` / `frAsyncData` / `frAsyncError` slots), `fr-load-more` (next page of an infinite query in place: `frAsyncPending` rows, `frLoadMoreItem` on each item for focus)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Feedback       | `fr-message` (inline, never a toast), `fr-empty-state` (a list or search region with nothing: `[icon]`, `title` (text, not a heading), `description`, projected action; never a bare muted line. A listbox's no-matches line stays plain text), `fr-meter` (current/max as a bar plus number: `label`, `value`, `max`; `low`/`high`/`optimum` set a status tone, accent without them; `variant="segmented"` for small counts), `fr-skeleton` (loading content), `fr-spinner` (action progress only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Focus          | `[frRovingFocus]` (`horizontal\|vertical\|grid`, `rovingWrap`, `rovingColumns`) with `frRovingFocusItem` (`rovingSelected`, `rovingDisabled`): a dense group (segmented, chips, tabs, sheet rows) is one Tab stop; arrows, Home and End move inside it, RTL aware. Give the group a composite role (`toolbar`, `grid`, `listbox`); `fr-tabs` is the exception, a `<nav>` of links. A component carrying `RovingFocusItem` as a host directive reports its selection with `followSelected`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Icons          | `fr-icon` (Lucide; `[icon]`, `size`, `tone`, `label`, `spin`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Media          | `fr-image` (`alt` required, `decorative` for `alt=""`; `size`, `aspect`, `fit`; lazy, shimmers until loaded, `(failed)`), `fr-avatar` (`name`, optional `src`, `size`; initials when there is no image)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Locale         | `fr-date` (Temporal values only), `fr-distance` (`[feet]`: a rules distance in the viewer's unit and locale)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Controls       | Plain: `fr-text-input`, `fr-search-input` (`(searched)` debounced), `fr-text-area`, `fr-number-input`, `fr-optional-number-input` (empty is no value, for an open bound), `fr-date-input`, `fr-toggle-button` (on/off), `fr-filter-chips` (several filters, `[(value)]` a set of keys), `fr-segmented` (2-3 options), `fr-select` (4+, `@angular/aria`); `fr-combobox` (`/data`: type to pick one of hundreds, `(searched)` out, `options` + `loading` in); `fr-picker` (`/data`: pick a row of a table schema, opened inline; `(searched)`, `(sorted)`, `(loadMore)` out, `rows`, `loading`, `loadingMore`, `hasMore` in)                                                                                                                                                                                                                                                                                                                                                                                                     |
| Forms          | `fr-form`, `fr-async-form`; `fr-text-field`, `fr-text-area-field`, `fr-number-field`, `fr-date-field`, `fr-toggle-button-field`, `fr-segmented-field`, `fr-select-field`, `fr-picker-field` (`/data`); parts `fr-field`, `fr-label`, `fr-field-hint`, `fr-field-error`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Inline edit    | `InlineEdit<T>` controller + `fr-inline-field`, which shows the save status (spinner, Saved, Revert while the window is open)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Data (`/data`) | `fr-table` (TanStack Table), `fr-chart` (TanStack Charts), `fr-virtual-list` (TanStack Virtual) with `ng-template [frVirtualItem]` for its rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### Heading depth

`fr-heading` has levels 1-4 and stays that way: content headings deeper than
4 are clamped to `h4`, not given `h5` or `h6`. Rich text headings are
relative: a document's level 1 sits one below the heading the text is under
(`pio-rich-text [headingLevel]`), and `pio-rich-prose` clamps the sum at 4.
An outline that needs more depth is a page that needs splitting.

## Storybook

Every component has a story next to it (`<name>.stories.ts`). Add one with
each new component or variant. `nx storybook frontier` serves it,
`nx build-storybook frontier` builds it (targets come from
`@nx/storybook/plugin`). It runs on Vite through
`@analogjs/storybook-angular`, zoneless, with frontier's CSS, router,
TanStack Query and the `en` messages provided in `.storybook/preview.ts`;
the toolbar switches theme and colour mode. That preview comes from
`storybookPreview` (`src/storybook.ts`, `@pioneer/frontier/storybook`),
which every `ui` library's Storybook shares; `nx storybook storybook`
serves Pioneer's Storybook, which composes them all (`apps/storybook`).

- Import story types from `@analogjs/storybook-angular`, never
  `@storybook/angular`.
- Story templates use only `fr-*` components, like feature templates. Demo
  copy may be literal: stories are not shipped, and Tailwind doesn't scan them.
- Simulated server work uses `succeedSlowly` / `failSlowly`
  (`testing/story-actions.ts`), so pending states are visible.
- Storybook's types bring in `@types/node`. Code that keeps a timer id as a
  `number` calls `window.setTimeout`, which stays the DOM overload.

### Story tests

`nx test-storybook frontier` (in `affected` and CI; `ci:storybook` runs every
library's) runs every story as a
test in headless Chromium through the Vitest addon, once, in the frontier theme and
dark mode (`check:contrast` covers the other themes and modes): its `play` function, then axe. Any axe
violation fails, colour contrast included. On Linux the devshell provides
Chromium from nixpkgs (macOS has no Nix browsers wired up yet). The
`playwright` version in `package.json` must equal nixpkgs'
`playwright-driver`; the run stops with a pin-this-version error when a
flake update moves the driver.

- Fix a violation rather than silence it. A known one waits on its fix by
  turning that rule off in the story's `parameters.a11y.config.rules`, with a
  comment linking the issue.
- Interaction tests are `play` functions using `storybook/test`. Storybook's
  `userEvent` sends synthetic events, which never trigger native behaviour
  (Enter on a `<summary>`); press real keys with `pressKeys`
  (`testing/story-keyboard.ts`) and tag that story `!dev` so it runs only in
  the runner (`fr-disclosure`'s Keyboard story). `hover`
  (`testing/story-pointer.ts`) moves the real mouse, for `:hover`.

## Specs

Every component also has a sibling spec (`<name>.component.spec.ts`):
`bun run check:components` fails on a component missing its spec or story.
A part only reachable through the component that assembles it
(`fr-list-item`, the field parts) opts out in
`tools/check-component-coverage.ts`, naming the spec or story that covers it.
Specs that need content projected into `ng-template` slots render a host
component from `src/lib/testing/` (`AsyncRegionHost`, `VirtualListHost`).

## Plain controls vs form fields

Prefer inline editing; use a form only where values must go in together,
such as creating a character.

- **Plain controls** (`fr-text-input`, …) are just the value widget:
  `[(value)]`, `(committed)` on Enter or a pick, `(cancelled)` on Escape,
  `ariaLabel`. No label, hint or error. Use them in `fr-inline-field`.
- **Form fields** (`fr-text-field`, …) are a plain control assembled in
  `fr-field` with `fr-label` and `fr-field-hint` / `fr-field-error`, and
  implement `FormValueControl<T>` (`@angular/forms/signals`), so bind them
  with `[formField]`. Need a different arrangement? Compose the parts
  yourself: the control inside `fr-field` picks up its id, description and
  invalid state through DI.

Signal forms own form state; TanStack Form is not used.

## Async versions

Every component that triggers work has an async version with the same four
states, named as TanStack Query names them: **idle → pending → success →
idle**, or **error**.

- **pending**: spinner in place, `aria-busy`, further presses ignored.
- **success**: a tick for `SUCCESS_FLASH` (2s), then back to idle.
- **error**: the message inline next to the trigger (`fr-message`, linked by
  `aria-describedby`) until the next attempt. Never a toast.

| Plain           | Async                                                             |
| --------------- | ----------------------------------------------------------------- |
| `fr-button`     | `fr-async-button [action]`                                        |
| `fr-form`       | `fr-async-form [form] [action]` + `fr-async-button type="submit"` |
| a region        | `fr-async-region` over a TanStack query                           |
| a plain control | `fr-inline-field` + `InlineEdit<T>`                               |

`injectAsyncAction(() => fn)` is the shared core: a TanStack mutation
(`injectMutation`) plus the success flash, exposed as signals (`status`,
`isPending`, `errorMessage`, …) with `run()` / `reset()`. Build new async
components on it. `fr-async-form` validates with signal forms' `submit()`
first, so an invalid form never runs the action or shows a tick; Mod+Enter
submits it. An `fr-async-button type="submit"` inside an `fr-async-form`
shows the form's submission (found through DI).

## TanStack

| Library | Used for                                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Query   | Server state: stores use `injectQuery` and update the cache; async components use mutations. Apps call `provideTanStackQuery`.               |
| Pacer   | `InlineEdit`'s save debounce (`Debouncer`), `fr-search-input`'s, `fr-combobox`'s and `fr-picker`'s query debounce.                           |
| Hotkeys | Enter / Escape on plain controls (scoped to the control), Mod+Enter in `fr-async-form`.                                                      |
| Table   | `fr-table`: sorting, semantic table, token styling. Build columns with `tableColumns<Row>()`.                                                |
| Charts  | `fr-chart`: series use `--fr-chart-1…6`, axes use the text colour; both follow dark mode.                                                    |
| Virtual | `fr-virtual-list`: window-scrolled, measured rows; the page scrolls, not the list. `fr-combobox`, `fr-picker`: rows scroll inside the panel. |

Store and Form are not used: signals cover client state and signal forms
cover forms.

## Table view in the URL

A table's view (sorting, hidden columns, filters, search, page size) can live in the page's query string, so a link
reopens it identical. Keys and rules are fixed in ADR-0068; the `@pioneer/frontier/data` pieces:

- Give each column that may appear in a shared view a short stable `code` in the schema: `addText({ id: 'level',
code: 'lvl', … })`. `tableViewColumns(columns)` turns the built columns into the codec's `TableViewSchema`.
- `encodeTableView` / `decodeTableView` are the pure codec. Keys: `s` sort, `f` facets, `c` columns, `n` page size, `q`
  search. Defaults are omitted and malformed parts are dropped.
- `injectTableView({ schema, facets })` holds the view in the route and gives signals and setters. Bind one way with the
  matching output: `[sorting]="view.sorting()" (sortingChange)="view.setSorting($event)"` on `fr-table`, and
  `[value]="view.filters()" (valueChange)="view.setFilters($event)"` on `fr-filter-bar`. `setSearch` replaces the
  history entry, so wire a search box to it; the rest push.
- `f` is opaque here. The page passes a `FacetTextCodec` that maps the bar's conditions to its own facet codec; frontier
  never imports `rules/*`, and there is no second encoding of the filters.
- Keep codec functions small; template lint caps cyclomatic complexity at 5 per file, so split files early.

## Breadcrumbs from the route

`fr-page-header` works out the trail of the active route and shows it in the `fr-shell` header (through
`HeaderCrumbs`), not on the page; a page never passes items. Each route sets
`data: { [CRUMB]: crumb }` (`CRUMB` and `Crumb` from `@pioneer/frontier`):

- A string is a message key, translated when the trail shows.
- A function `(route) => Signal<string | undefined>` runs once per header in its injection context, so it can inject
  the route's store or a query. It returns the translated name, or `undefined` while it loads, which shows a skeleton.
  The page renders at once; there are no resolvers.
- Routes follow `{category}/{pluralThing}/{id}`: Content Browser / Spells / Fireball, Characters / Briar Rose /
  Encounter. A collection that is its own category (`characters`) has no plural segment. A sheet tab is a child route
  below the id, so it is in the URL and is the last crumb. `apps/web/src/app/route-convention.spec.ts` fails on a
  page route without a crumb or an id whose crumb is not a function.
- A step with no page of its own redirects to the list (`/content/feat` opens the browser on feats). One step alone
  shows no trail.

## Inline editing

Each editable value gets its own `InlineEdit<T>`: its own loading skeleton,
saving spinner, saved tick, validation (pass the shared Zod schema) and
error/conflict state. Saves are one PATCH per field with the aggregate's
`expectedVersion`; a 409 shows a conflict instead of overwriting.

**There are no save or cancel buttons.** Values save themselves:

1. Tap the value: the read view becomes the control, focused.
2. Typing saves 600ms after the last change (`SAVE_DEBOUNCE`). Enter, a
   select pick, or blur saves at once. Invalid drafts never save; the
   schema's message shows inline.
3. Spinner while saving (`pending`), then "Saved" with a tick (`success`) and a **Revert** button for 5s
   (`REVERT_WINDOW`). Revert restores the value from before the edit
   session and saves it. Revert is a visible button, not hover-only.
4. Blur, or 5s untouched after a save, returns to the read view. Revert
   stays available in the read view until its window ends.
5. Escape drops an unsaved change and closes; saved changes stay.

One save runs at a time per field; a change made meanwhile saves after it.
A new server value never overwrites unsaved typing. Wire the control with
`[value]="x.draft()" (valueChange)="x.change($event)"
(committed)="x.flushSoon()" (cancelled)="x.cancel()"`.
