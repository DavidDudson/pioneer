window.BENCHMARK_DATA = {
  "lastUpdate": 1795831688356,
  "repoUrl": "https://github.com/DavidDudson/pioneer",
  "entries": {
    "Pioneer page budgets": [
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7d9d31c953c1d1296b27a7abc3cc6bd0bb0b73c1",
          "message": "fix(play): repair the checks the companion merge left red (#2419)\n\n* fix(play): add the companion species kind to the content examples\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(character): repair the checks the companion merge left red\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(character): clear the lint the companion stack left on main\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T01:19:00Z",
          "tree_id": "2c30fd4365ec9ce891d9312669d684ffca47b1f3",
          "url": "https://github.com/DavidDudson/pioneer/commit/7d9d31c953c1d1296b27a7abc3cc6bd0bb0b73c1"
        },
        "date": 1795829805761,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4258,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 1779,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6354,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 211,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7521d6648ee1857f44a6da936169c5918e38cdc4",
          "message": "feat(frontier): fr-card with header, content and footer parts (#2445)\n\n* feat(frontier): fr-card with header, content and footer parts\n\nCard has no padding of its own; header, content and footer pad from one\ntoken so dividers run edge to edge. Section is rebuilt on the card.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): act on review findings for fr-card\n\nKeep the section's content gap, treat an empty heading as a title not a\nloading state, share the padding lookup between card parts, and cover the\nloading header and standalone parts in the spec.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T11:21:22+10:00",
          "tree_id": "00edb9ab8dc15a27d44b3beaba281edc79e356bd",
          "url": "https://github.com/DavidDudson/pioneer/commit/7521d6648ee1857f44a6da936169c5918e38cdc4"
        },
        "date": 1795830100906,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4263,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 218,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6364,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 213,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8f5a676fc04df640243102524343e6eda2ab8514",
          "message": "feat(play): coin ledger (#2242)\n\n* feat(play): coin ledger\n\nEvery change to the purse is a ledger entry with a reason and a signed\nchange per coin; coins stay stored by denomination and always equal the sum\nof the entries. Character.apply and withInventory write the entry by diffing\nthe coins, so shop purchases, hand edits and transfers are all recorded. A\nnew character's coins, and an older one's on upgrade (schema 23), become the\nopening entry. The Wealth section shows the total in gp and the entries,\nnewest first.\n\nRefs #512\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(play): bound the coin ledger list, log rune etching as a purchase\n\nReview fixes for the coin ledger: rune etching pays through\nwithInventory with a purchase reason instead of a hand edit, the Wealth\nlist shows the newest 20 entries with a show-all button and keys rows by\nledger position, the gold total keeps two decimals, the barrel exports\nonly what other libraries use, and ADR-0080 records why the ledger is\nstored beside coins. Adds tests for the purchase reason, the payment\npath and an upgrade with no coins.\n\nRefs #512\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(play): keep the coin ledger's helpers module-private\n\nknip flagged CoinChangeAmount and isNoChange as unused exports after the\nbarrel was trimmed.\n\nRefs #512\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(play): Earn Income (#2268)\n\n* feat(play): Earn Income\n\nThe Downtime tab can work a task for pay. The player picks a trained\nskill, the task level and the days, rolls the skill against the task's\nDC and collects: an earnIncome patch pays the Player Core income table's\namount for each day into the purse, as one income entry in the coin\nledger. A critical success pays the next level up, a failure the failed\ncolumn and a critical failure nothing. Untrained characters cannot earn\nincome, as the table has no column for them.\n\nRefs #513\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(play): review fixes for Earn Income\n\nMake the degree labels and payout follow the language, keep a degree rolled\nwhile Collect is in flight, drop a stale degree when the skill changes, share\nthe payout between the panel and the engine, and move the coin names into\ntheir own module. Test the patch bounds and every row of the income table.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T11:37:10+10:00",
          "tree_id": "1686664e7fdec1bb55920de25ea14fe3b574b65c",
          "url": "https://github.com/DavidDudson/pioneer/commit/8f5a676fc04df640243102524343e6eda2ab8514"
        },
        "date": 1795831064584,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4269,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 219,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1236,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6374,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 225,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a0ac052139b2626fd872631f7916812dd3c0d0db",
          "message": "perf(sheet): hold the sections' content until the engine's has loaded (#2426)\n\n* perf(sheet): hold the sections' content until the engine's has loaded\n\nThe sheet's header waits on the registry the engine reads (about 20 of\nthe 53 kinds), but every section asks for the kinds it needs from the\nfirst frame. Fetched together they share the browser's connections and\nthe store's reads, so the header waited on 7 MB of content it never\nreads.\n\nA SheetContentGate, provided by the sheet page, holds a registry of\npriority Section back until the engine's query has settled; the two\nengine registries opt out. Off the sheet there is no gate.\n\nProduction build, level 20 Wizard, medians of 5 runs over 3 alternating\nrounds: cold sheet:ready 900-1400 ms -> about 770, warm 440-680 -> about\n320, cold sheet:header 500-750 -> about 310.\n\nRefs #1884\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(sheet): act on mob-review findings for the content gate\n\n- Provide the gate on the sheet page only. The level 1 builder shares\n  the sheet's providers and never released it, so its registries would\n  not have loaded.\n- Release it once the character is open too: before that the engine's\n  query is the one without items, which can settle first.\n- Load the focus pool's spell registry as Engine, as the header reads\n  it.\n- Rename open to mayLoad, update the doc on injectContentRegistry, and\n  cover a disabled registry and the gate's release in the spec.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test(sheet): wait for the environment toggle before pressing it\n\nThe options come with the section's content, which now loads after the\nsheet's engine content, so the first button in the section can be the\nbreath control.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T11:37:22+10:00",
          "tree_id": "0af18169aaffad7a39feed93fd35fa12eff2756f",
          "url": "https://github.com/DavidDudson/pioneer/commit/a0ac052139b2626fd872631f7916812dd3c0d0db"
        },
        "date": 1795831124242,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4269,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 219,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6368,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 209,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8352e80fdf73939f7b05e000f0cc4b2d5c4ba9d2",
          "message": "refactor(rules-sdk): decouple content model from rule-element-* (#2278)\n\n* refactor(rules-sdk): decouple content model from rule-element-*\n\nContent entries, variant rules and creature abilities hold `rules` as\nslim references (`rule-reference.ts`), so the content model imports\nnothing from `rule-element*`. A typed overlay (`typed-content.ts`,\n`typed-content-entry.ts`) rebuilds the same schemas with `RuleElements`\nvia `.extend`, keeping issue paths, order and abort behaviour; the index\nexports it under the existing names, so consumers are unchanged.\n\nWeaponCategory, ArmorCategory, LanguageCount, SpellPreparation, RuleSlug\nand RuleElementKey move to neutral files; potency-element becomes\nrule-element-potency. variantLimitsInForce moves to content-registry so\nthe limits file no longer reaches the pack layer. A boundary spec holds\nthe import rule.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(rules-sdk): apply review fixes to the content model split\n\nTrim narrating comments, name the slim variant rule schema\nVariantRuleDefinitionModel, make the boundary test catch side-effect and\ndynamic imports, point the docs at typed-content.ts, and add specs for\nunconditionalGrants and a variant rule's rules inside a pack.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T11:37:50+10:00",
          "tree_id": "bac3b768a2f11bb934051e134de73cd27b8c1030",
          "url": "https://github.com/DavidDudson/pioneer/commit/8352e80fdf73939f7b05e000f0cc4b2d5c4ba9d2"
        },
        "date": 1795831155443,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4272,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 213,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6377,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 214,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2cbc2ee8b1f0a22b29fd7e67fad21be7b70350c4",
          "message": "fix(play): add the companion species kind to the content examples (#2444)\n\nmain fails web typecheck (TS2741): ContentKind.CompanionSpecies has no\nentry in EXAMPLE_CONTENT_ENTRIES or CONTENT_KIND_KEYS. Same three hunks\nas the open fix PR (libs/play/feature content-entry-examples,\nrules-core-examples and the en key), so the two merge cleanly in either\norder.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T11:38:26+10:00",
          "tree_id": "bac3b768a2f11bb934051e134de73cd27b8c1030",
          "url": "https://github.com/DavidDudson/pioneer/commit/2cbc2ee8b1f0a22b29fd7e67fad21be7b70350c4"
        },
        "date": 1795831289405,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4272,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 216,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6377,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 209,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "fd2bd8341fde8201782e5dd567b43aadd887c616",
          "message": "refactor(frontier): share search, translate and virtual-row helpers (#2420)\n\n* refactor(frontier): share the search debounce across the three controls\n\nExtract injectSearchQuery (debounce, stale-query drop, repeat guard) from\nfr-search-input, fr-combobox and fr-picker. SEARCH_DEBOUNCE moves out of\nthe search input into the shared helper.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): add injectTranslate for messages that load late\n\nReplace the translationLoadSuccess re-read in the spell picker, the option\npicker columns and the route crumbs with one injectTranslate signal.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): share virtual rows between the combobox and picker\n\nAdd the frVirtualRows and frVirtualRow directives: the pinned highlight and\npicked rows, scroll-into-view, reset on new rows, measuring and placement\nthat fr-combobox and fr-picker-grid each wired up by hand.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): act on mob-review findings\n\nDrop the Translate type from the barrel (no consumer outside frontier),\nremove the staleness comment repeated at three injectSearchQuery call\nsites, trim the injectTranslate doc, and cover the resetOn scroll reset\nin the virtual-rows spec.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(frontier): stop exporting TranslateParams\n\nNothing outside inject-translate.ts imports it, so knip failed the\nworkspace lint.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T11:39:04+10:00",
          "tree_id": "88b17f62bbadc13d5fbef4b90cce9a5604d3c99e",
          "url": "https://github.com/DavidDudson/pioneer/commit/fd2bd8341fde8201782e5dd567b43aadd887c616"
        },
        "date": 1795831443710,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4272,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 213,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1236,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6377,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 214,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "970dbd59838237612b9d194ab9327adddc196566",
          "message": "test(play): cover the activations of armour runes (#2446)\n\nArmour already gets the activations of its working property runes through\nthe shared per-line reader. Add an invisibility rune (daily) and a winged\nrune (hourly) as fixtures and test that armour lists them, spends them\nunder the armour and the activation, and is unusable until invested.\n\nRefs #1648\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T11:38:43+10:00",
          "tree_id": "27771628e6a0106a738e26abd9c50e5e644ba3c3",
          "url": "https://github.com/DavidDudson/pioneer/commit/970dbd59838237612b9d194ab9327adddc196566"
        },
        "date": 1795831448587,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4272,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 217,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1236,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6377,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 218,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "eb1f844a55df0c398c6af8583afbc453260be4e8",
          "message": "refactor(frontier): one control-size scale under pointer:fine (#2447)\n\n* refactor(frontier): one control-size scale under pointer:fine\n\nControl sizes were hand-paired in every component as\n`h-touch pointer-fine:h-control-*`. The `--fr-size-control-*` variables\nnow default to the 2.75rem touch size and shrink once, under\n`@media (pointer: fine)` in semantic.css, so components write a single\n`h-control-*` or `min-h-control-*` class.\n\nHeights use `min-h-*` where text can wrap (button, link, tab, disclosure);\nan icon-only button keeps a fixed height so `aspect-square` stays square.\nButton lg now has a fine-pointer size (3rem touch, 2.75rem fine).\n\nRefs #2279\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): act on mob-review findings\n\nFix the AGENTS.md and semantic.css wording that said every control size\nis 2.75rem on touch (lg is 3rem), shorten the new doc comments, add the\nxs size to the Button Sizes story and tighten the inline link spec.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T11:39:26+10:00",
          "tree_id": "7067ba1a3144406c75590bfb2416b964000cf38f",
          "url": "https://github.com/DavidDudson/pioneer/commit/eb1f844a55df0c398c6af8583afbc453260be4e8"
        },
        "date": 1795831502191,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4272,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 214,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6377,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 213,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "DavidDudson@users.noreply.github.com",
            "name": "David Dudson",
            "username": "DavidDudson"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0772723623824af81be4081de2d0a4596779571c",
          "message": "chore(web): add browserslist for last 2 major versions (#2450)\n\nAngular fell back to its built-in defaults. Pin an explicit modern\ntarget so build output and tooling share one source of truth.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:02:06+10:00",
          "tree_id": "3bab3c25bf053fba59b4189075056a1370b89fb2",
          "url": "https://github.com/DavidDudson/pioneer/commit/0772723623824af81be4081de2d0a4596779571c"
        },
        "date": 1795831684853,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "page /characters: requests",
            "value": 465,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters: transfer",
            "value": 4272,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 215,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          },
          {
            "name": "page /characters/:id: requests",
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6377,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 215,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      }
    ]
  }
}