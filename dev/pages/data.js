window.BENCHMARK_DATA = {
  "lastUpdate": 1795830104408,
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
      }
    ]
  }
}