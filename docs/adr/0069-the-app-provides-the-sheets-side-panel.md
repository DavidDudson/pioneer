# 0069. The app provides the sheet's side panel and loads its messages

- Status: Proposed
- Date: 2026-10-18

## Context

The character sheet docks the rules content search in its drawer (ADR-0065). The panel is a content-context component,
and the character feature may not import the content one. Two things follow:

1. Something outside both must connect them.
2. The panel's text lives in message scopes (ADR-0009) that the sheet's route knows nothing about. `provideMessageScope`
   registers a multi provider, and multi providers do not merge across injectors: a route that provides its own scopes
   shadows those a parent route provided. Scopes put on a wrapper route above the character routes were therefore
   never seen by `loadWithMessages`, and nothing else loaded them, so the panel could show raw keys.

## Decision

1. The character feature declares a seam, the `SHEET_SIDE_PANEL` injection token: a loader that returns the component
   for the drawer. Without a provider the token is `undefined`, and the sheet has no header button, the drawer stays
   empty and the shell search stays.
2. The app (`apps/web`) provides the token on the `characters` route with a factory that loads the content feature's
   `loadSidePanel` on first use, so the content chunk is fetched when the drawer needs it, not with the sheet.
3. A component mounted outside its own context's routes loads its message scopes itself. `loadSidePanel` calls
   `loadMessageScopes` (`shared/web`, the loader `loadWithMessages` already uses) for every scope the panel reads,
   including those of the components it embeds, before it returns the component. It never relies on scopes provided on a
   parent route.
4. While the panel is mounted the shell's own search is hidden (`ShellSearch`), since the panel has the shortcut. The
   host releases it when the sheet is left, and never takes it after that.

## Consequences

- The character and content contexts stay independent; the app is the only place that knows both.
- A second host for the panel needs only the token and no copy of its message list.
- A scope the panel starts to read must be added to `loadSidePanel`, or it renders raw keys. `side-panel-messages.spec.ts`
  checks that the scopes the panel reads resolve once it is loaded.
- Alternative not taken: provide the scopes on the wrapper route and rely on idle preloading. It fails whenever a
  child route provides scopes of its own, which the character routes do.
