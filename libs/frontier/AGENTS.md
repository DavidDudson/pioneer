# frontier: agent guide

frontier is Pioneer's design system and the **only** place Tailwind exists.
Read this before touching any UI.

## Rules

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
  `fr-async-form`, `<h1>`–`<h4>` only in `fr-heading`, `<p>` only in
  `fr-text`, `<ul>` / `<ol>` only in `fr-list`, `<li>` only in
  `fr-list-item`, table elements only in `fr-table`, `<svg>` only in `fr-icon`,
  `<textarea>` only in `fr-text-area`, `<details>` / `<summary>` only in
  `fr-disclosure`. `select` and `img` have no owner yet:
  add a primitive first. The ownership map lives in
  `tools/eslint/no-native-elements.ts`.
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
  with borders (`border-line-*`) and surface colours instead.
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
  glyphs (`✓`, `▲`) and no hand-drawn SVG. Lines are always 2px at every
  size (`nonScalingStroke`); there is no stroke-width input. Size is a token
  (`sm|md|lg`), colour follows the text unless `tone` is set. Icons are
  decorative unless given a `label`; an icon-only button labels the button.
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
  need. `@pioneer/frontier/data` (Table, Chart, VirtualList) is separate so
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
2. **No modals.** No `<dialog>`, `popover`, `role="dialog|alertdialog"`, CDK or
   Material dialogs, bottom sheets, or `alert`/`confirm`/`prompt`. Show the
   content inline (expand in place with `fr-disclosure`, inline edit) or give it its own route.
   See rule 4 for when a confirmation is allowed at all.
3. **No full page loads. Always partial load + skeleton.**
   - Navigate with `routerLink` / `Router`. No internal `href`, no
     `location.reload|assign|replace`, no assigning `location`.
   - No route resolvers: the page renders immediately and each region fetches
     its own data.
   - Every region that waits on data shows `fr-skeleton` shaped like the
     content it replaces, not a spinner and not a blank page. `fr-page` shows
     a title skeleton while `title` is `undefined`.
   - After a change, refresh only the region that changed; never reload the
     page or the whole list to show one updated value.
   - `fr-spinner` is for in-place action progress only (a button's `loading`,
     an inline save), never for loading content.
4. **Avoid confirmations.** Act on the first press and make the action
   reversible instead: inline edit's Revert, an undo next to what changed, a
   restorable archive in place of a delete. Ask only before an action that is
   both destructive and irreversible (deleting a character for good), and then
   inline: a second press on the same button, never a modal.

## Data entry

Preferences, not lint rules: follow them unless a case clearly needs
otherwise, and say why in the PR when you don't.

- **Avoid checkbox and radio lists.** Pick the control by how many options
  there are:
  - **On/off:** `fr-toggle-button`, outlined when off and filled with the
    accent when on. The label names the setting and stays the same in both
    states. Several independent settings are a row of toggle buttons.
  - **One of 2-3 options:** `fr-segmented` (`fr-segmented-field` in forms),
    every option visible as a button group.
  - **One of 4 or more:** `fr-select` (`fr-select-field`). Past three, a row
    of buttons gets cramped on a phone; a dropdown scales.
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
  composes them and has no responsive CSS. Need new responsive behaviour? Add
  an input to a primitive. Lint (`pioneer/layout-variants`) bans viewport
  variants (`sm:`, `max-*:`, …), container variants outside the primitives,
  and container sizes other than `@sm|@md|@lg` (`@max-*`, `@[…]`). The
  built-CSS check fails on any viewport width media query.
- **The primitives.**
  - `fr-box`: a region. Query container, `width="full|prose|page"`,
    `padding`, and `gutter` (inline padding that widens with the box).
  - `fr-grid`: `[columns]` is the count once the grid is wide enough: one
    column when narrow (two for six-up), more at `@md` / `@lg` of the grid's
    own width. `minItem` is fluid at every width.
  - `fr-stack`: vertical by default; `horizontalFrom="sm|md|lg"` makes it a
    row once the stack itself is that wide.
  - An element can't query its own size, so grid, box and responsive stacks
    are a container host around an inner layout element. Containers fill
    their parent's width (inline-size containment stops them shrink-wrapping
    content), so don't put one inside a horizontal flex row without a width.
- **One column of content on phone.** Nothing scrolls sideways except an
  explicit overflow region (such as the shell nav). Don't hide content on
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
   `--fr-line-*`, `--fr-accent-*`, status (`danger|success|warning|info`),
   spacing names (`3xs … 3xl`), named sizes (`--fr-size-touch`,
   `--fr-size-control-*`, …), motion, opacity, z-index, chart series.
   Colours reference ramp steps only, never a hue.
3. **Tailwind mapping** (`frontier.css` `@theme`): exposes tier 2 as
   utilities (`bg-surface-raised`, `text-fg-muted`, `gap-md`,
   `text-heading`, `border-line-subtle`).

## Themes and colour modes

Two independent axes, both attributes on `<html>`, set by `ThemeStore`
(remembered in localStorage; `apps/web/src/index.html` applies them before
boot):

- **Mode** (`data-mode`): **dark is the default** on plain `:root`; light is
  `data-mode="light"`. Modes live only in `semantic.css` and only choose ramp
  steps, so every theme gets both modes for free.
- **Theme** (`data-theme`): a file in `src/styles/themes/`. `frontier.css`
  is the default on plain `:root` and defines every parameter; others
  (`tavern.css`) override under `:root[data-theme='<name>']`. A theme sets
  each role's hue and chroma, and may override mode-independent tokens:
  `--fr-font-body|display|mono`. If a theme needs a different
  mode-dependent value (tavern's parchment surfaces), scope it to
  `:root[data-theme='<name>'][data-mode='light']` or
  `…:not([data-mode='light'])` so it beats the mode block.

Adding a theme: create `themes/<name>.css`, import it in `frontier.css`
after `themes/frontier.css`, and add it to `Theme` in
`lib/theme/theme-store.ts`. Check text contrast in both modes.

## Components

| Area           | Components                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout         | Primitives `fr-box`, `fr-grid`, `fr-stack`; composed `fr-shell`, `fr-page`, `fr-surface`                                                                                                  |
| Disclosure     | `fr-disclosure` (expand in place; `frDisclosureSummary` takes phrasing content only, nothing interactive)                                                                                 |
| Lists          | `fr-list` (`ordered` for `<ol>`, `markers` for bullets or numbers, `gap`) with `fr-list-item`                                                                                             |
| Text           | `fr-text` (`element="span\|p"`), `fr-heading` (`[level]` for the outline, `variant` for the look)                                                                                         |
| Actions        | `fr-button` (`(pressed)`), `fr-async-button`, `fr-link` (`to` routes, `href` external only)                                                                                               |
| Async          | `injectAsyncAction`, `fr-async-indicator`, `fr-async-region` (+ `frAsyncPending` / `frAsyncData` / `frAsyncError` slots)                                                                  |
| Feedback       | `fr-message` (inline, never a toast), `fr-skeleton` (loading content), `fr-spinner` (action progress only)                                                                                |
| Icons          | `fr-icon` (Lucide; `[icon]`, `size`, `tone`, `label`, `spin`)                                                                                                                             |
| Dates          | `fr-date` (Temporal values only)                                                                                                                                                          |
| Controls       | Plain: `fr-text-input`, `fr-number-input`, `fr-date-input`, `fr-toggle-button` (on/off), `fr-segmented` (2-3 options), `fr-select` (4+, `@angular/aria`)                                  |
| Forms          | `fr-form`, `fr-async-form`; `fr-text-field`, `fr-number-field`, `fr-date-field`, `fr-segmented-field`, `fr-select-field`; parts `fr-field`, `fr-label`, `fr-field-hint`, `fr-field-error` |
| Inline edit    | `InlineEdit<T>` controller + `fr-inline-field`                                                                                                                                            |
| Data (`/data`) | `fr-table` (TanStack Table), `fr-chart` (TanStack Charts), `fr-virtual-list` (TanStack Virtual)                                                                                           |

## Storybook

Every component has a story next to it (`<name>.stories.ts`). Add one with
each new component or variant. `nx storybook frontier` serves it,
`nx build-storybook frontier` builds it (targets come from
`@nx/storybook/plugin`). It runs on Vite through
`@analogjs/storybook-angular`, zoneless, with frontier's CSS, router,
TanStack Query and the `en` messages provided in `.storybook/preview.ts`;
the toolbar switches theme and colour mode.

- Import story types from `@analogjs/storybook-angular`, never
  `@storybook/angular`.
- Story templates use only `fr-*` components, like feature templates. Demo
  copy may be literal: stories are not shipped, and Tailwind doesn't scan them.
- Simulated server work uses `succeedSlowly` / `failSlowly`
  (`testing/story-actions.ts`), so pending states are visible.
- Storybook's types bring in `@types/node`. Code that keeps a timer id as a
  `number` calls `window.setTimeout`, which stays the DOM overload.

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

| Library | Used for                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Query   | Server state: stores use `injectQuery` and update the cache; async components use mutations. Apps call `provideTanStackQuery`. |
| Pacer   | `InlineEdit`'s save debounce (`Debouncer`).                                                                                    |
| Hotkeys | Enter / Escape on plain controls (scoped to the control), Mod+Enter in `fr-async-form`.                                        |
| Table   | `fr-table`: sorting, semantic table, token styling. Build columns with `tableColumns<Row>()`.                                  |
| Charts  | `fr-chart`: series use `--fr-chart-1…6`, axes use the text colour; both follow dark mode.                                      |
| Virtual | `fr-virtual-list`: window-scrolled, measured rows; the page scrolls, not the list.                                             |

Store and Form are not used: signals cover client state and signal forms
cover forms.

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
