window.BENCHMARK_DATA = {
  "lastUpdate": 1795840056059,
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
          "id": "d8774532133b791dd840079f39c8b3e6240f8fec",
          "message": "build(lint): replace anti-slop with @cloudflare/oxlint-config (#2374)\n\n* build(lint): extend @cloudflare/oxlint-config as a passing baseline\n\nMove .oxlintrc.json to oxlint.config.ts, bump oxlint to 1.95, switch the\ntype-aware backend to tsrs. React, jsx-a11y and @nkzw rules stay off\n(Angular). Rules the preset adds are off until each is evaluated.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(lint): adopt the preset's quality rules, drop duplicate anti-slop\n\nquality/* (nkzw's port of anti-slop) replaces nine vendored rules with no\nfindings; the vendored no-object-parameters, no-unknown-returns and\nno-unsafe-dictionary-type stay, as the quality ports report 108 findings\nand Pioneer's overrides target the vendored names. Enable no-only-tests and\npromise/prefer-catch (seven .then(a, b) calls rewritten). Keep Pioneer's\nstricter options and T[] arrays over the preset's looser ones, with the\nreasons recorded in oxlint.config.ts.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs(lint): record which anti-slop rules the preset replaced\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* build(lint): turn on every preset rule, drop the last vendored duplicates\n\nquality/* now covers no-object-parameters, no-unknown-returns and\nno-unsafe-dictionary-type, keeping Pioneer's per-path overrides under the\nnew names. Only react-hooks/rules-of-hooks (misreads use* domain helpers)\nand @nkzw/no-instanceof (93 sites) stay off, with reasons recorded.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(lint): restore config comment casing, tidy rule sections\n\nThe commit hook's oxlint --fix capitalised wrapped comment lines in\noxlint.config.ts; restore them and exempt the file from\ncapitalized-comments. Merge the duplicate section banners and correct the\nrule counts in UPSTREAM.md.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(lint): justify the record guard's unknown values under quality/*\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* build(lint): drop the revived .oxlintrc.json, port main's page-budget exemption\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* style(lint): array types as Array<T>, preset fixes for new main code\n\nMechanical oxlint --fix for typescript/array-type plus bun fmt, a regenerated\nlockfile, the regexp, sonarjs and boundary rules ported from main into\noxlint.config.ts, and fixes for the companion code that landed on main.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* style(lint): array types in the companion code main just repaired\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* style(lint): array types in the new fr-card spec\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* style(lint): array types in the code that landed on main meanwhile\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:07:58+10:00",
          "tree_id": "2fe929028311148b8d85c0b06b2cf460acb43a2f",
          "url": "https://github.com/DavidDudson/pioneer/commit/d8774532133b791dd840079f39c8b3e6240f8fec"
        },
        "date": 1795832044210,
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
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6376,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 216,
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
          "id": "212fe52e5118a95e218f77764d93cfa7f727cec3",
          "message": "feat(frontier): show action status on the border, not a spinner (#2448)\n\n* feat(frontier): show action status on the border, drop the spinner\n\nButtons and text inputs take a status: a conic-gradient arc turns round\nthe border while pending, then it flashes green on success or red on\nfailure. Pending text stays for screen readers. Revert on an inline edit\nis an icon button. Spinner and Icon spin are removed.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): act on review of the status border\n\nDrop border-radius (frontier is sharp), show the pending label on the\nlanguage picker, remove a duplicate computed and the stale spin docs,\nand cover the error and announce-only states.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:16:15+10:00",
          "tree_id": "6ef059be0efda0cff64f7f5c4f9189d64c2cbae0",
          "url": "https://github.com/DavidDudson/pioneer/commit/212fe52e5118a95e218f77764d93cfa7f727cec3"
        },
        "date": 1795832441020,
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
            "value": 4273,
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
            "value": 1236,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6378,
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
          "id": "77d52f3bc835a705df9e9b04f028752c17fc1291",
          "message": "feat(frontier): add fr-table-toolbar and use it on the list pages (#2425)\n\n* feat(frontier): add fr-table-toolbar and use it on the list pages\n\nA layout-only toolbar with search, filters, view and count slots. It owns\nits gaps and the gap to the table: one row from the md container size,\nstacked below it with Filters and Columns buttons that open their slot in\nplace. The count slot is a polite live region.\n\nfr-box gains shownFrom, hiddenFrom, revealed and grow so the toolbar can\nrespond to its own width without adding responsive CSS outside a\nprimitive. The content browser, the character list and the shop stop\ncomposing their own search and filter stacks.\n\nRefs #2351\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(frontier): query the toolbar width for box visibility\n\nfr-box put its shownFrom/hiddenFrom container variants on the inner\nelement, whose nearest container is the box itself, so a box in the\ntoolbar row tested its own width: a non-growing box has none, so the\nFilters and Columns buttons never hid and a grown one stayed narrower\nthan md, so the filters never showed on a wide toolbar. The variants\nnow sit on the host, which reads the row around it.\n\nAlso keep the count's gap to the row only while a count is projected,\ncover the Columns button and closing a slot in the spec, add a wide\nwidth check to the Default story, and trim duplicated doc comments.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* style(frontier): use Array<T> in the toolbar files\n\nThe lint config moved to @cloudflare/oxlint-config, whose array-type\nrule forbids T[] and readonly T[].\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:23:25+10:00",
          "tree_id": "f7996aad77cfe110ee03ae032ae5a484e93ee675",
          "url": "https://github.com/DavidDudson/pioneer/commit/77d52f3bc835a705df9e9b04f028752c17fc1291"
        },
        "date": 1795832875489,
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
            "value": 4278,
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
            "value": 1236,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6383,
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
          "id": "ce0b8821f6611fffd4e361ea5288ee19613d32b3",
          "message": "fix(lint): clear the assertions-in-tests errors the new preset raised (#2451)\n\nThe cloudflare preset turned on sonarjs/assertions-in-tests. Three specs\nassert through expectPlain or assert(property(...)), which the rule does\nnot follow; turn it off for those files. The identity sign-out test had\nno assertion; it now checks the unknown token still has no session.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:55:19+10:00",
          "tree_id": "d0cffa554f15f4e769562a98b8478ef25f223e27",
          "url": "https://github.com/DavidDudson/pioneer/commit/ce0b8821f6611fffd4e361ea5288ee19613d32b3"
        },
        "date": 1795835532304,
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
            "value": 4282,
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
            "value": 6386,
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
          "id": "7aa7a5c1b1fb00b48b9b6de9175288ff8aa0d81f",
          "message": "feat(play): retraining (#2423)\n\n* feat(play): retraining projects in the build\n\nA character keeps one retraining: the pick in a feat, skill increase,\nrepertoire or class choice slot and the pick it becomes. A week of days\nfor a feat, skill increase or spell, a month for a class choice. The last\nday's work swaps the pick through the same slot checks as selectSlot and\nlifts the one-repertoire-swap-a-level limit. Schema version 24.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(play): retraining section on the Downtime tab\n\nPick a held feat, skill increase, spell or class choice and what it\nbecomes, work the days, cancel. A shared injectTranslationChanges\nsignal replaces Earn Income's own copy.\n\nRefs #515\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(play): act on review of retraining\n\nRefuse slot edits on the slot being retrained, move a signature pick\nwith a retrained repertoire spell, show the pick's name in the project\nline, and test the last-day guard.\n\nRefs #515\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* style(play): use ReadonlyArray in retraining code\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:54:27+10:00",
          "tree_id": "811d99f01e19cadb54003910a91639a0aeaee301",
          "url": "https://github.com/DavidDudson/pioneer/commit/7aa7a5c1b1fb00b48b9b6de9175288ff8aa0d81f"
        },
        "date": 1795835540814,
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
            "value": 4282,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 220,
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
            "value": 6386,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 219,
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
          "id": "bdd8e8292ea5ac6bd32ea28f1b074e40bf017c14",
          "message": "chore(frontier): delete unused components (#2422)\n\n* chore(frontier): remove fr-page-aside\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* chore(frontier): drop the vertical fr-divider\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* chore(frontier): remove fr-section-index and fr-section-link\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* chore(frontier): remove fr-form, fr-select-field and fr-date-field\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs(frontier): drop fr-page-aside from the layout guide\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs(frontier): fix stale references found in review\n\nDrop the divider orientation from the layout guide and replace section-index wording left after the removals.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs(frontier): format the layout guide table\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:55:53+10:00",
          "tree_id": "d934204ad2cb4f7075a3d115575ec7c405f09880",
          "url": "https://github.com/DavidDudson/pioneer/commit/bdd8e8292ea5ac6bd32ea28f1b074e40bf017c14"
        },
        "date": 1795835777945,
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
            "value": 4281,
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
            "value": 6385,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 216,
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
          "id": "6a0dcfd33540b074128013f152b086231e90f02c",
          "message": "fix(knip): enter the storybook vitest configs, drop an unused export (#2452)\n\ntest-storybook is inferred by an Nx plugin since #2438, so knip no longer\nsees the .storybook vitest configs through project.json and reports them\nunused. List them as entries. DEFAULT_CARD_PADDING is only used in its\nown file.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:58:41+10:00",
          "tree_id": "cc50b464248459645c666aa6d2e95ed8fb24ba0b",
          "url": "https://github.com/DavidDudson/pioneer/commit/6a0dcfd33540b074128013f152b086231e90f02c"
        },
        "date": 1795835851782,
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
            "value": 4281,
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
            "value": 6385,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 1559,
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
          "id": "b9210aa40a1aacb1782f57ad2603feac1e4a082b",
          "message": "test(frontier): bind the card header story's heading when it is undefined (#2455)\n\nargsToTemplate drops an undefined arg, so the Loading story left the\nrequired heading input unbound and storybook raised NG0950 as an\nunhandled error, failing the frontier storybook run.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:58:54+10:00",
          "tree_id": "4576b0cd981751c982284201ca3718780a273b94",
          "url": "https://github.com/DavidDudson/pioneer/commit/b9210aa40a1aacb1782f57ad2603feac1e4a082b"
        },
        "date": 1795836050282,
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
            "value": 4281,
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
            "value": 6385,
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
          "id": "64d287c675384341be48729fea6bbfe986a2eb69",
          "message": "test(frontier): follow the status border in two stale specs (#2453)\n\nThe status border change dropped the success tick and made Revert an\nicon button, but two specs still looked for fr-icon and for the text\nRevert. Query the status region and the aria-label instead.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:59:07+10:00",
          "tree_id": "dff23196b8dc4e340d9ecabad046611a17cfc95f",
          "url": "https://github.com/DavidDudson/pioneer/commit/64d287c675384341be48729fea6bbfe986a2eb69"
        },
        "date": 1795836127430,
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
            "value": 4281,
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
            "value": 6385,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 212,
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
          "id": "e08d57b84c30f42166d465305687bd1f24b9e850",
          "message": "feat(frontier): add FilterCodec for filter conditions (#2457)\n\n* feat(frontier): add FilterCodec and per-kind default operators\n\nReads and writes FilterCondition[] as link text for any fields: the default operator is left unwritten, several conditions per field are allowed, and the earlier traits:fire,!evil form still decodes.\n\nRefs #2334\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(frontier): keep FilterCodec to operators and numbers a field reads\n\nDecode drops conditions whose operator the field kind lacks, bounds must be plain numbers, empty values are left out of the link, and the codec takes its default from defaultOperator.\n\nRefs #2334\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:59:36+10:00",
          "tree_id": "f11a62055dcce12e6d8f64ef97f04b153ae2aee0",
          "url": "https://github.com/DavidDudson/pioneer/commit/e08d57b84c30f42166d465305687bd1f24b9e850"
        },
        "date": 1795836144993,
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
            "value": 4281,
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
            "value": 6385,
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
          "id": "51647f1d40498407203b33ef170ed9c4c096ad2d",
          "message": "refactor(frontier): inset tokens, drop baked and negative margins (#2458)\n\n* refactor(frontier): inset tokens, drop baked and negative margins\n\nAdd inset-control/panel/page tokens. Overlay panels get their gap from per-position CDK offsetY so it flips with them; combobox and picker gap is owned by the host. Drop negative margins from inline button and plain disclosure.\n\nRefs #2280\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): act on review findings\n\nShare OverlayAlign, name the gap unit, use flex columns for the in-flow picker and combobox so a wide panel cannot widen the host, and use inset-panel on the hover card.\n\nRefs #2280\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:59:57+10:00",
          "tree_id": "dd43cd647ad32cd3c71d9d114cf7a1e6f800cd9f",
          "url": "https://github.com/DavidDudson/pioneer/commit/51647f1d40498407203b33ef170ed9c4c096ad2d"
        },
        "date": 1795836181875,
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
            "value": 4281,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 221,
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
            "value": 6386,
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
          "id": "4751ca37f4287374de79a849d7ab7f028789b65c",
          "message": "feat(frontier): fr-item with media, content and actions parts (#2459)\n\n* feat(frontier): add fr-item media, content and actions parts\n\nfr-list-item gains fr-item-media, fr-item-content and fr-item-actions,\nshares padding and divider with fr-description-item, and\nfr-skeleton gains kind=item.\n\nRefs #2290\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): act on review of fr-item parts\n\nShare the skeleton fill, build row classes with cx, add coverage\nexemptions for the item parts and tests for skeleton fill, item shape\nand description-item row defaults.\n\nRefs #2290\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T13:00:10+10:00",
          "tree_id": "0562982d1376b7e2805553c304abf48b5b03d7e6",
          "url": "https://github.com/DavidDudson/pioneer/commit/4751ca37f4287374de79a849d7ab7f028789b65c"
        },
        "date": 1795836294104,
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
            "value": 4283,
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
            "value": 6388,
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
          "id": "cd94e8434d85609edffb3681f4c4e0c5ff82e5c5",
          "message": "feat(frontier): table headers take message keys (#2461)\n\n* feat(frontier): table headers take message keys\n\nThe table translates each column header, so a language switch re-renders it\nand consumers no longer re-read messages to build their columns. Four level\nheader keys collapse into rules.column.level.\n\nCloses #2319\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(frontier): tighten table header keys after review\n\nShare one header-key schema, translate chooser labels only for key\nheaders, render empty translations, share the rune header map, and\ncover the chooser and non-string header paths with specs.\n\nRefs #2319\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T13:00:55+10:00",
          "tree_id": "adf91109ca6b985bb4ad3a8a74a38d9553f2a214",
          "url": "https://github.com/DavidDudson/pioneer/commit/cd94e8434d85609edffb3681f4c4e0c5ff82e5c5"
        },
        "date": 1795836297466,
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
            "value": 4282,
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
            "value": 1235,
            "unit": "requests",
            "extra": "all resources, desktop preset"
          },
          {
            "name": "page /characters/:id: transfer",
            "value": 6386,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 216,
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
          "id": "6dbe92645eac78555fd232dadfc3982df32ea025",
          "message": "fix(contrast): let size and status-angle tokens sit inside @media and keyframes (#2462)\n\nThe token cascade reader rejects any --fr-* token set outside a top-level\n:root rule. #2447 put control sizes in @media (pointer: fine) and #2448 a\nkeyframe on --fr-status-angle, so check:contrast threw. No contrast pair\nreads either family, so nested rules that set only those are skipped;\na nested rule that sets any other token still throws.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T13:07:34+10:00",
          "tree_id": "3dbe67c80d5aad40e736c3e6331486c6fd06a1e6",
          "url": "https://github.com/DavidDudson/pioneer/commit/6dbe92645eac78555fd232dadfc3982df32ea025"
        },
        "date": 1795836406386,
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
            "value": 4282,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 211,
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
            "value": 6386,
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
          "id": "9a5426a4cee9998ef24ea301e40926225a9c97ea",
          "message": "fix(lint): use Array<T> in eslint.config.ts (#2463)\n\noxlint tools eslint.config.ts, a step of lint:workspace, flags the\nLinter.Config[] type under the preset's array-type rule.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T13:07:47+10:00",
          "tree_id": "6ec7828d6df22d171ed88271df2100ed21d62a16",
          "url": "https://github.com/DavidDudson/pioneer/commit/9a5426a4cee9998ef24ea301e40926225a9c97ea"
        },
        "date": 1795836494970,
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
            "value": 4282,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 212,
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
            "value": 6386,
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
          "id": "62eaaa93ce56b037c2db0f168379f3ab595ff501",
          "message": "test(character): expect the Earn Income region on the Downtime tab (#2454)\n\nThe coin ledger put Earn Income on the Downtime tab; the sheet page spec\nstill listed three regions there.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T12:56:11+10:00",
          "tree_id": "dc1e17f79f21cb399fc8309900f9e801166609f3",
          "url": "https://github.com/DavidDudson/pioneer/commit/62eaaa93ce56b037c2db0f168379f3ab595ff501"
        },
        "date": 1795836638529,
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
            "value": 4281,
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
            "value": 6379,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 208,
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
          "id": "2d69bc1b6730eb9daec74654fab8133d3b2aeb4f",
          "message": "fix(web): keep TableViewStore out of the frontier data entry (#2470)\n\n* fix(web): keep TableViewStore out of the frontier data entry\n\napp.config imported the TableViewStore token from @pioneer/frontier/data,\nwhich holds TanStack Table, Charts and Virtual. That entry exists so only\nlazy routes pay for them; the import put all of it in the initial bundle\n(1.18 MB to 1.35 MB) and broke the 1.2 MB initial budget on main.\n\nExport the token from the main entry, which has no dependencies on those\nlibraries, and import it from there. The initial bundle is back to 1.18 MB.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs(frontier): note where TableViewStore is exported from\n\nShorten the export comment and record in AGENTS.md that the token lives\nin the main entry, so a later tidy-up does not move it back into /data.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T14:03:29+10:00",
          "tree_id": "ca15c8903d62f51da0c775877425887b0345a839",
          "url": "https://github.com/DavidDudson/pioneer/commit/2d69bc1b6730eb9daec74654fab8133d3b2aeb4f"
        },
        "date": 1795838910232,
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
            "value": 4291,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters: LCP",
            "value": 209,
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
            "value": 6401,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 219,
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
          "id": "0b0c6ff60128d43f7b7ce081bde0515e3de63126",
          "message": "docs(adr): first UI languages and translation workflow (#2472)\n\n* docs(adr): first UI languages and translation workflow\n\nPick de and fr as the first UI locales, translators submitting pull\nrequests against per-scope catalog files, machine-drafted first\ncatalogs marked by a locale status, a shippability bar on the core\nscopes, primary-tag locales with per-key regional fallback, and an\nunchosen content locale following the UI locale. Amends ADR-0009 and\nADR-0013.\n\nRefs #2206\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs(adr): act on review of the language workflow ADR\n\nCorrect the plural-category claim (German matches English; French adds\nmany), state that an unchosen content locale follows the UI locale\nwithout a way back, as ADR-0013 requires, say the locale registry and\nper-locale checks do not exist yet, and add cost and licence to the\nWeblate and Crowdin rejections.\n\nRefs #2206\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-28T14:23:03+10:00",
          "tree_id": "64e05c36209686f62990cf7249de016fae21458d",
          "url": "https://github.com/DavidDudson/pioneer/commit/0b0c6ff60128d43f7b7ce081bde0515e3de63126"
        },
        "date": 1795840052166,
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
            "value": 4291,
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
            "value": 6401,
            "unit": "KB",
            "extra": "transfer size of all resources"
          },
          {
            "name": "page /characters/:id: LCP",
            "value": 217,
            "unit": "ms",
            "extra": "median of the Lighthouse runs, simulated"
          }
        ]
      }
    ]
  }
}