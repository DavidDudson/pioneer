window.BENCHMARK_DATA = {
  "lastUpdate": 1795831067560,
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
      }
    ]
  }
}