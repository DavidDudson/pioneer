# 0009. Internationalisation with lazy-loaded messages and content text

- Status: Accepted; locale resolution superseded by [0013](0013-account-only-display-preferences.md)
- Date: 2026-10-08

## Context

Pioneer is text-only, so text is the product. The PF2e community plays in many languages, and Foundry pf2e has
community translations of both UI and content. Adding i18n late means rewriting every template and every string
the engine produces. Translations also add weight, so they must load only when needed.

## Decision

- **Runtime i18n, one build.** The Angular app switches locale at runtime (no per-locale builds). Messages use ICU
  MessageFormat (plurals, select); numbers, dates and lists use `Intl`. Library: Transloco (runtime, scoped lazy
  loading) with `@jsverse/transloco-messageformat` for ICU. Chosen without a separate spike: it supports Angular 22
  and ships scope loading. A small signal-based loader remains the fallback.
- **No user-facing strings in code.** Templates use message keys; a lint rule rejects literal text in templates and
  a CI check fails on missing or unused keys in the source locale (`en`).
- **The engine returns message descriptors, not strings.** Breakdown labels, reasons ("suppressed by a higher
  status bonus"), conditional summaries ("in forest") and validation errors are `{ key, params }`. The UI formats
  them in the viewer's locale. The predicate summary vocabulary is a per-locale message table.
- **Content text is separate from mechanics.** Each pack ships a locale-independent mechanics bundle (what the
  engine needs) and per-locale text bundles: names and short text, plus descriptions sharded so an entry's
  description loads only when viewed. Missing translations fall back to `en`, per field, marked in the UI.
- **Smart lazy loading.**
  - UI messages are split by route scope and loaded with the route; the shell scope is inlined in the first load.
  - Content names for a kind load with that kind's mechanics bundle; descriptions load on demand by shard.
  - Likely next scopes and shards are prefetched when the browser is idle (the builder's next step, the feats of
    the character's class).
  - All bundles are content-hashed, immutable and cached in IndexedDB keyed by hash, so a locale switch
    downloads only text, never mechanics.
- **Locale resolution:** account preference, then `Accept-Language`, then `en`. Content locale can differ from UI
  locale (English rules text with a German UI is a valid choice).
- **Units and layout:** distances render per locale preference (feet, or metres at 1.5 m per 5 ft as translated
  books do); frontier uses logical CSS properties so right-to-left locales work.

## Consequences

- Every UI epic includes its message keys in the `en` source locale; translations are added independently.
- Content translations live in `content_entry_texts (entry_id, locale, field, text)`; homebrew authors can add
  translations for their own packs.
- Community Foundry translation modules (Babele-based) can be imported later as text-only packs that attach to
  existing entries by Foundry id.
- The engine cannot be tested by comparing English strings; tests assert on message keys and params.
