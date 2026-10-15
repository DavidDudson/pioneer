window.BENCHMARK_DATA = {
  "lastUpdate": 1792068078499,
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
          "id": "5c927bfe19fde80c156c5b6b95b4d20fa29d15a2",
          "message": "feat(content): import The Mwangi Expanse for Goloma (#877)\n\nLets the Foundry importer take pre-remaster Open Game License books named\nin OGL_BOOKS, which selection otherwise skips, and registers The Mwangi\nExpanse as the first. Imports it once at pf2e-8.6.0 into a mwangi-expanse\npack (the Goloma ancestry and heritages among 104 entries), adds the OGL\nlicence, the Section 15 notice on the Legal page and NOTICE.md.\n\nBriar Rose's Goloma and Vigilant Goloma now match loaded content.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T22:35:30+10:00",
          "tree_id": "00bdb008ea1f2e02e8bc4b32464c4f97cd502aa8",
          "url": "https://github.com/DavidDudson/pioneer/commit/5c927bfe19fde80c156c5b6b95b4d20fa29d15a2"
        },
        "date": 1792067804102,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.419,
            "unit": "ms",
            "extra": "median 5.174 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.258,
            "unit": "ms",
            "extra": "median 5.123 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.853,
            "unit": "ms",
            "extra": "median 1.083 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.042,
            "unit": "ms",
            "extra": "median 1.351 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.565,
            "unit": "ms",
            "extra": "median 1.117 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "649f17684a26da49b4251475263ce881356bba6e",
          "message": "ci(bench): level 20 grant benchmark for every class (#884)\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T22:39:02+10:00",
          "tree_id": "0f6adeb84df8cdb2457488fdaa4f06cfc173c963",
          "url": "https://github.com/DavidDudson/pioneer/commit/649f17684a26da49b4251475263ce881356bba6e"
        },
        "date": 1792068077250,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "grants: level 20 Bard with every slot it offers picked",
            "value": 0.624,
            "unit": "ms",
            "extra": "median 0.773 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Cleric with every slot it offers picked",
            "value": 0.809,
            "unit": "ms",
            "extra": "median 1.316 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Druid with every slot it offers picked",
            "value": 0.61,
            "unit": "ms",
            "extra": "median 0.689 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter with every slot it offers picked",
            "value": 0.523,
            "unit": "ms",
            "extra": "median 0.63 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Ranger with every slot it offers picked",
            "value": 0.916,
            "unit": "ms",
            "extra": "median 1 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Rogue with every slot it offers picked",
            "value": 0.732,
            "unit": "ms",
            "extra": "median 0.833 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Witch with every slot it offers picked",
            "value": 0.484,
            "unit": "ms",
            "extra": "median 0.547 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Wizard with every slot it offers picked",
            "value": 0.516,
            "unit": "ms",
            "extra": "median 0.569 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Alchemist with every slot it offers picked",
            "value": 0.596,
            "unit": "ms",
            "extra": "median 0.744 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Barbarian with every slot it offers picked",
            "value": 0.649,
            "unit": "ms",
            "extra": "median 0.726 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Champion with every slot it offers picked",
            "value": 0.924,
            "unit": "ms",
            "extra": "median 1.021 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Investigator with every slot it offers picked",
            "value": 0.72,
            "unit": "ms",
            "extra": "median 0.787 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Monk with every slot it offers picked",
            "value": 0.513,
            "unit": "ms",
            "extra": "median 0.557 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Oracle with every slot it offers picked",
            "value": 0.823,
            "unit": "ms",
            "extra": "median 0.888 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Sorcerer with every slot it offers picked",
            "value": 0.508,
            "unit": "ms",
            "extra": "median 0.548 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Swashbuckler with every slot it offers picked",
            "value": 1.042,
            "unit": "ms",
            "extra": "median 1.131 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Animist with every slot it offers picked",
            "value": 0.468,
            "unit": "ms",
            "extra": "median 0.508 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Exemplar with every slot it offers picked",
            "value": 0.735,
            "unit": "ms",
            "extra": "median 0.781 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.518,
            "unit": "ms",
            "extra": "median 5.887 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.185,
            "unit": "ms",
            "extra": "median 5.402 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.074,
            "unit": "ms",
            "extra": "median 1.269 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.898,
            "unit": "ms",
            "extra": "median 1.104 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.416,
            "unit": "ms",
            "extra": "median 0.942 ms, 51 runs after 20 warm-up, budget 3 ms"
          }
        ]
      }
    ]
  }
}