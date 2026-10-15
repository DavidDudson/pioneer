window.BENCHMARK_DATA = {
  "lastUpdate": 1792067240851,
  "repoUrl": "https://github.com/DavidDudson/pioneer",
  "entries": {
    "Pioneer benchmarks": [
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
          "id": "13db1deda93837ab88f6fcb5c2d8c17169f5d119",
          "message": "ci(bench): benchmark suite with tracked history (#876)\n\n`bun run bench` runs every *.bench.ts, one process each, and writes\ncustomSmallerIsBetter JSON. A shared harness warms up, times 51 runs and\nreports the fastest (tracked) and the median; budgets stay hard\nassertions. The four grants/catalog benches move into the suite.\n\nA workflow records history to gh-pages (dev/bench) on main and, on PRs,\ncomments and fails above 150% of the baseline. Docs in\ndocs/benchmarks.md.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T22:23:17+10:00",
          "tree_id": "a8fc2bc225b6151d3f648453069da0cf5433ac61",
          "url": "https://github.com/DavidDudson/pioneer/commit/13db1deda93837ab88f6fcb5c2d8c17169f5d119"
        },
        "date": 1792067239324,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.13,
            "unit": "ms",
            "extra": "median 4.129 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.111,
            "unit": "ms",
            "extra": "median 4.261 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.646,
            "unit": "ms",
            "extra": "median 0.848 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.719,
            "unit": "ms",
            "extra": "median 1.138 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.504,
            "unit": "ms",
            "extra": "median 0.662 ms, 51 runs after 20 warm-up, budget 3 ms"
          }
        ]
      }
    ]
  }
}