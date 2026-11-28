# 0084. German and French first; translators submit pull requests against catalog files

- Status: Proposed
- Date: 2026-11-28
- Amends: [0009](0009-i18n-and-lazy-loading.md) (UI and content locale defaults),
  [0013](0013-account-only-display-preferences.md) (unchosen content locale)

## Context

ADR-0009 built the runtime for other languages and left four questions open: which languages ship first, how
translators contribute, when a locale is complete enough to ship, and how regional tags behave. Only `en` exists
today: 20 `en.json` catalogs, one per message scope, and `LocaleSchema` accepts nothing else.

Community translations of the Foundry pf2e system exist as Babele modules. Checked on 2026-11-28:

| Language | Module                                  | Licence         | State                                                                                                                                |
| -------- | --------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| de       | `lang-de-pf2e` (Foundry-VTT-PF2-German) | MIT             | UI and most compendia, tracks PF2 8.5.1, released this autumn. Remastered entries stay English until an official translation exists. |
| fr       | `pf2-fr` (pathfinder-fr, GitLab)        | Apache-2.0      | Large, long-lived repo. Completeness and remaster coverage not verified; last listed release 8.0.0.                                  |
| es       | `pf2e-es` (allnnde)                     | ORC             | Aligned to 8.6.x, but its own README says editorial review is pending and the base text was machine-translated.                      |
| pt-BR    | `pathfinder-2e-pt-br` (mclemente)       | MIT (code only) | Crowdin-driven; content licence not stated; completeness not verified.                                                               |
| pl       | `lang-pl-pf2e` (BartekB)                | MIT             | Not verified.                                                                                                                        |
| ja       | none for PF2e (PF1e only)               |                 |                                                                                                                                      |
| zh       | `pf2e_compendium_chn`, `pf2e_cn`        | not extracted   | Active, Weblate; split across two modules.                                                                                           |

Official Paizo-licensed translations exist for German (Ulisses Spiele). A French official PF2e line was not
confirmed. There is no evidence of demand for a right-to-left language.

## Decision

- **First languages: `de` and `fr`.** German has the best-verified module and an official publisher. French has an
  active community module. Two languages with different plural rules and a longer-than-English text profile prove
  the pipeline without doubling the catalog volume. The module state above is the reason to pick them; it is not a
  promise about content: content text arrives through ADR-0009's translation import, not through this decision.
- **No right-to-left locale yet.** `textDirection` and the logical-CSS rule stay, so adding one later needs no
  layout work. Revisit when there is real demand.
- **Workflow: pull requests against catalog files.** Each message scope keeps one catalog per locale beside its
  source: `src/i18n/en.json`, `de.json`, `fr.json`. Translators open ordinary pull requests; the per-locale checks
  (parameter match, valid ICU, stale keys) gate them. A catalog file is plain JSON in the same shape as `en.json`.
- **First drafts are machine translations, marked as such.** A locale registry records each locale's status:
  `machine-draft` or `reviewed`. The account language picker shows the status beside the coverage it already
  shows, so nobody mistakes a draft for reviewed text. Native review is tracked as its own story; a locale
  becomes `reviewed` through a pull request that says who reviewed it.
- **A locale ships when its core scopes are complete.** The shell, `identity` (settings) and `character` (sheet and
  builder) scopes must be 100% translated; every other scope may be partial and falls back to `en` per key, as
  ADR-0009 already specifies. A locale below the bar is not added to `Locale`. Coverage is the existing
  `translatedShare` of the language picker.
- **Regional tags are not separate locales by default.** Only primary tags ship. A regional tag becomes its own
  locale only when its text differs, and its catalog then holds the overrides only. Lookup falls back one key at a
  time: `pt-BR`, then `pt`, then `en`.
- **UI locale and content locale default together.** ADR-0013's two stored fields stay. An unchosen
  `contentLocale` follows `uiLocale`; a content locale chosen separately keeps its value. Content text still
  falls back per field to `en` (ADR-0009), so a German UI reads English rules text until a content translation is
  imported.

## Rejected options

- **Hosted Weblate.** Friendlier for non-developers, but it adds an external service, an account and its
  configuration before anyone has translated a message. It syncs through git, so it can be added over the same
  catalog files later. Revisit when contributors ask for it or review load grows.
- **Crowdin.** Proprietary and locks the workflow to one vendor.
- **`es` and `pt-BR` now.** Doubles the catalogs to keep in step. The Spanish module's own review is pending, and
  the Portuguese content licence is unstated. They are good second-wave candidates and exercise the `pt-BR`
  fallback chain.
- **A single pilot locale.** Fastest, but proves one plural set and one fallback path.
- **Regions as separate full locales.** Duplicates a whole catalog for a few differing words.
- **Waiting for human translators before shipping.** Blocks the languages story on people we do not have yet.

## Consequences

- Catalog count grows from 20 to 60 files; the extraction and check tooling ([#2208](https://github.com/DavidDudson/pioneer/issues/2208))
  keeps them in step with `en`, so it lands before the locales ([#2207](https://github.com/DavidDudson/pioneer/issues/2207)).
- Machine drafts ship visibly marked. Quality depends on the follow-up native review.
- No platform account is needed to contribute; the cost is that a translator needs a GitHub account and the
  JSON format. The translator guide covers both.
- The `Locale` enum, `LocaleMessages` loaders and the settings picker change in the locales story; this ADR
  changes none of them.
