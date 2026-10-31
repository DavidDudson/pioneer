# 0074. A full-screen dice overlay and a result toast are allowed for rolls

- Status: Proposed
- Date: 2026-10-31
- Amends: rules 3 and 4 of ADR-0065

## Context

ADR-0065 keeps toasts and every overlay banned: feedback is inline, next to what caused it. A roll is the one event
where the player wants the opposite. The dice should tumble across the whole screen, and the total should stay in
view without moving the page or taking the player away from the button they pressed. An inline result next to a
roll button would be hidden when the page scrolls, and one element per roller cannot be consistent across the sheet,
the play page and inline text rolls.

## Decision

1. **Roll overlay.** While a roll plays, a transparent canvas covers the viewport. It is `aria-hidden`,
   `pointer-events: none` and holds no focus, so the page stays interactive underneath. It is mounted for the roll
   and removed when the dice have settled and faded out.
2. **Roll toast.** When the dice settle, a small pill-shaped `role="status"` toast at the bottom centre shows the
   total and the roll's name. It dismisses itself after a short delay, a newer roll replaces it, and it is the
   accessible way to learn the result. It never holds a control the player must use, with one future exception: a
   button that opens the roll log.
3. **The engine owns the result.** The rules engine rolls the faces with the app's random source. The animation is
   told which faces to land on (predetermined outcomes), so it can never change a total.
4. **`prefers-reduced-motion`** skips the overlay: the toast appears at once.
5. **Scope.** This is the only toast and the only overlay outside `fr-drawer`. Any other toast or overlay still needs
   its own ADR, and ADR-0065 rules 3 and 4 otherwise stand.
6. **Library.** `@3d-dice/dice-box-threejs` (Three.js and cannon-es), loaded with a dynamic import on the first roll
   so it stays out of the initial bundle. It was chosen over `@3d-dice/dice-box` because only it can land on faces
   the caller gives it. Its textures are static assets of the web app.
7. **Pill.** The toast is round-ended, which frontier's sharp-and-flat rule forbids. `--radius-pill` and
   `rounded-pill` are the one radius, used by `fr-toast` alone; `pioneer/class-tokens` and the built-CSS check allow
   that utility and nothing else.
8. **Colour.** Dice and the total's text are coloured by damage type from frontier tokens (`--fr-damage-<type>`), read
   from the computed style when the dice are built, so both themes and modes work. The type is also named in the
   toast: colour is never the only carrier.

## Consequences

- Rolls feel physical, and the result is visible wherever the player is on the page.
- The library cannot colour dice of one throw separately, so a roll of several damage types throws all its dice in the
  first type's colour; the toast names the types and the roll log breaks the total down per type.
- A WebGL canvas and Three.js are a new dependency and a lazy chunk; the first roll pays the load, which is why the
  toast also works without the animation.
- `pioneer/no-interruptions` still bans `<dialog>`, `role="dialog"` and internal `href`; the toast uses
  `role="status"` and needs no exception.
- Reviewers hold the exception to rolls: no other feature gets a toast under this ADR.
