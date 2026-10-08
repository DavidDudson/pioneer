# frontier: agent guide

frontier is Pioneer's design system and the **only** place Tailwind exists.
Read this before touching any UI.

## Rules

- **Apps and features never style.** Outside `libs/frontier`, templates may
  not use `class`, `[class]`, `[ngClass]`, `style`, `[style]` or `[ngStyle]`,
  and components may not have `styleUrl`/`styles`. Lint enforces it. If a
  layout can't be built from frontier components, add a component or an
  input to frontier.
- **Tokens only.** Components take token names (`gap="md"`, `tone="muted"`),
  never lengths or colours. Inside frontier, only semantic utilities exist:
  the default Tailwind palette, spacing and type scales are wiped in
  `src/styles/frontier.css`.
- **Separate files.** Every component has a `.ts` and `.html`; no inline
  templates or styles.
- **Literal class maps.** Variants map token names to full class strings in
  `Record<…, string>` objects so Tailwind's scanner sees them. Never build a
  class name by concatenation (`'gap-' + gap`).
- **Const objects, not enums** for every variant set (`Space.Md`,
  `ButtonVariant.Primary`).

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
   content inline (expand in place, inline edit) or give it its own route.
   Confirm destructive actions inline, e.g. a second click or an undo.
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

1. **Primitives** (`primitives.color.css`, `primitives.scale.css`): OKLCH
   ramps (`--fr-ember-600`), spacing/type/radius/duration scales. Ramps are
   generated by `scripts/generate-ramps.ts`; never edit the CSS by hand.
2. **Semantic** (`semantic.css`): `--fr-surface-*`, `--fr-fg-*`,
   `--fr-line-*`, `--fr-accent-*`, status (`danger|success|warning|info`),
   spacing names (`3xs … 3xl`), radius roles, shadows, motion. Dark mode
   remaps these only.
3. **Tailwind mapping** (`frontier.css` `@theme`): exposes tier 2 as
   utilities (`bg-surface-raised`, `text-fg-muted`, `gap-md`,
   `text-heading`, `rounded-control`).

## Components

| Area        | Components                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Layout      | Primitives `fr-box`, `fr-grid`, `fr-stack`; composed `fr-shell`, `fr-page`, `fr-surface`       |
| Text        | `[frText]` directive on any element (keeps semantics)                                          |
| Actions     | `button[fr-button]`                                                                            |
| Feedback    | `fr-skeleton` (loading content), `fr-spinner` (action progress only)                           |
| Dates       | `fr-date` (Temporal values only)                                                               |
| Forms       | `fr-field`, `fr-text-input`, `fr-number-input`, `fr-date-input`, `fr-select` (`@angular/aria`) |
| Inline edit | `InlineEdit<T>` controller + `fr-inline-field`                                                 |

Form controls implement `FormValueControl<T>` from `@angular/forms/signals`,
so they work with `[formField]` as well as `[(value)]`.

## Inline editing

Each editable value gets its own `InlineEdit<T>`: its own loading skeleton,
saving spinner, saved tick, validation (pass the shared Zod schema) and
error/conflict state. Saves are one PATCH per field with the aggregate's
`expectedVersion`; a 409 shows a conflict instead of overwriting.

**There are no save or cancel buttons.** Values save themselves:

1. Tap the value: the read view becomes the control, focused.
2. Typing saves 600ms after the last change (`SAVE_DEBOUNCE_MS`). Enter, a
   select pick, or blur saves at once. Invalid drafts never save; the
   schema's message shows inline.
3. Spinner while saving, then "Saved ✓" and a **Revert** button for 5s
   (`REVERT_WINDOW_MS`). Revert restores the value from before the edit
   session and saves it. Revert is a visible button, not hover-only.
4. Blur, or 5s untouched after a save, returns to the read view. Revert
   stays available in the read view until its window ends.
5. Escape drops an unsaved change and closes; saved changes stay.

One save runs at a time per field; a change made meanwhile saves after it.
A new server value never overwrites unsaved typing. Wire the control with
`[value]="x.draft()" (valueChange)="x.change($event)"
(committed)="x.flushSoon()" (cancelled)="x.cancel()"`.
