window.BENCHMARK_DATA = {
  "lastUpdate": 1792238189915,
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
          "id": "9f41a4515ba8bd73be61ecb276345fb639522624",
          "message": "feat(play): staff charges at daily preparations (#878)\n\n* feat(play): prepare a staff with charges at daily preparations\n\nDaily preparations take an optional staff and a slot to expend. The staff\ngets charges equal to the highest spell rank, plus the expended slot's\nrank; any earlier staff loses its charges. The server refuses a staff the\ncharacter does not have and a slot it cannot expend.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(play): staff picker at daily preparations\n\nThe preparations preview offers the character's staves and, once one is\npicked, the slots of its prepared entries to expend. The preview lists\nthe staff's charges and the slot before anything applies. The rest panel\nnow loads item content, so item activation resets show in the preview.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T22:40:01+10:00",
          "tree_id": "4d4d422fa15a050b1693722800f4a56f7a608e0d",
          "url": "https://github.com/DavidDudson/pioneer/commit/9f41a4515ba8bd73be61ecb276345fb639522624"
        },
        "date": 1792068142394,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "grants: level 20 Bard with every slot it offers picked",
            "value": 0.788,
            "unit": "ms",
            "extra": "median 0.902 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Cleric with every slot it offers picked",
            "value": 0.979,
            "unit": "ms",
            "extra": "median 1.244 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Druid with every slot it offers picked",
            "value": 0.731,
            "unit": "ms",
            "extra": "median 0.786 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter with every slot it offers picked",
            "value": 0.65,
            "unit": "ms",
            "extra": "median 0.735 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Ranger with every slot it offers picked",
            "value": 1.129,
            "unit": "ms",
            "extra": "median 1.185 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Rogue with every slot it offers picked",
            "value": 0.983,
            "unit": "ms",
            "extra": "median 1.034 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Witch with every slot it offers picked",
            "value": 0.664,
            "unit": "ms",
            "extra": "median 0.706 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Wizard with every slot it offers picked",
            "value": 0.686,
            "unit": "ms",
            "extra": "median 0.741 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Alchemist with every slot it offers picked",
            "value": 0.772,
            "unit": "ms",
            "extra": "median 0.845 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Barbarian with every slot it offers picked",
            "value": 0.826,
            "unit": "ms",
            "extra": "median 0.876 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Champion with every slot it offers picked",
            "value": 1.175,
            "unit": "ms",
            "extra": "median 1.23 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Investigator with every slot it offers picked",
            "value": 0.918,
            "unit": "ms",
            "extra": "median 0.995 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Monk with every slot it offers picked",
            "value": 0.641,
            "unit": "ms",
            "extra": "median 0.719 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Oracle with every slot it offers picked",
            "value": 1.075,
            "unit": "ms",
            "extra": "median 1.122 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Sorcerer with every slot it offers picked",
            "value": 0.655,
            "unit": "ms",
            "extra": "median 0.714 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Swashbuckler with every slot it offers picked",
            "value": 1.347,
            "unit": "ms",
            "extra": "median 1.415 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Animist with every slot it offers picked",
            "value": 0.598,
            "unit": "ms",
            "extra": "median 0.649 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Exemplar with every slot it offers picked",
            "value": 0.912,
            "unit": "ms",
            "extra": "median 0.957 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.35,
            "unit": "ms",
            "extra": "median 5.195 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.445,
            "unit": "ms",
            "extra": "median 5.455 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.145,
            "unit": "ms",
            "extra": "median 1.383 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.038,
            "unit": "ms",
            "extra": "median 1.286 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.541,
            "unit": "ms",
            "extra": "median 1.091 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "ef11e87866614f2fa2b0715d5eecc523e506f0c7",
          "message": "ci(bench): full level 20 builds for every class (#886)\n\nReplaces the per-class grants benchmark with one that derives a whole\ncharacter: every slot filled (origin, boosts, skills, languages, feats,\nspells), the best armor, shield and weapons in use, worn items invested\nand consumables carried, timed through inputs and statistics.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:04:32+10:00",
          "tree_id": "581c4a742555ed4008133f556a87dc4a05103752",
          "url": "https://github.com/DavidDudson/pioneer/commit/ef11e87866614f2fa2b0715d5eecc523e506f0c7"
        },
        "date": 1792069675070,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 19.911,
            "unit": "ms",
            "extra": "median 21.761 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 28.759,
            "unit": "ms",
            "extra": "median 30.974 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 21.257,
            "unit": "ms",
            "extra": "median 22.846 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 18.317,
            "unit": "ms",
            "extra": "median 19.124 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 22.007,
            "unit": "ms",
            "extra": "median 23.406 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 21.192,
            "unit": "ms",
            "extra": "median 22.372 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 21.619,
            "unit": "ms",
            "extra": "median 22.726 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 19.677,
            "unit": "ms",
            "extra": "median 20.697 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 19.637,
            "unit": "ms",
            "extra": "median 20.542 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 20.453,
            "unit": "ms",
            "extra": "median 21.593 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 24.514,
            "unit": "ms",
            "extra": "median 25.708 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 22.712,
            "unit": "ms",
            "extra": "median 23.84 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 18.494,
            "unit": "ms",
            "extra": "median 19.742 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 20.875,
            "unit": "ms",
            "extra": "median 22.064 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 18.847,
            "unit": "ms",
            "extra": "median 19.812 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 26.98,
            "unit": "ms",
            "extra": "median 28.527 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 17.841,
            "unit": "ms",
            "extra": "median 19.125 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 27.349,
            "unit": "ms",
            "extra": "median 28.806 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.232,
            "unit": "ms",
            "extra": "median 5.216 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.136,
            "unit": "ms",
            "extra": "median 5.551 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.931,
            "unit": "ms",
            "extra": "median 1.124 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.952,
            "unit": "ms",
            "extra": "median 1.221 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.514,
            "unit": "ms",
            "extra": "median 1.07 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "217efa4632eaab0a000784fcfe8d51d241e84cba",
          "message": "feat(sheet): staff spells in their own spell list section (#887)\n\nEach worn or held staff gets a section in the spell list with its\nspells by rank, the charge cost of each and the charges left.\nSpells the holder can't cast show as unavailable with the reason.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:05:02+10:00",
          "tree_id": "faec44335cdfabc3ac0edf93b9b3ea36400e417d",
          "url": "https://github.com/DavidDudson/pioneer/commit/217efa4632eaab0a000784fcfe8d51d241e84cba"
        },
        "date": 1792069781505,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 18.915,
            "unit": "ms",
            "extra": "median 21.334 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 28.143,
            "unit": "ms",
            "extra": "median 30.093 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 20.345,
            "unit": "ms",
            "extra": "median 22.14 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 18.206,
            "unit": "ms",
            "extra": "median 19.724 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 22.472,
            "unit": "ms",
            "extra": "median 24.476 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 21.53,
            "unit": "ms",
            "extra": "median 22.624 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 21.978,
            "unit": "ms",
            "extra": "median 23.076 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 20.064,
            "unit": "ms",
            "extra": "median 21.507 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 19.446,
            "unit": "ms",
            "extra": "median 20.804 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 21.098,
            "unit": "ms",
            "extra": "median 22.429 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 25.485,
            "unit": "ms",
            "extra": "median 26.703 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.283,
            "unit": "ms",
            "extra": "median 24.186 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 18.974,
            "unit": "ms",
            "extra": "median 20.406 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 21.235,
            "unit": "ms",
            "extra": "median 22.186 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 19.723,
            "unit": "ms",
            "extra": "median 20.933 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.278,
            "unit": "ms",
            "extra": "median 29.695 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 18.994,
            "unit": "ms",
            "extra": "median 19.953 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 27.993,
            "unit": "ms",
            "extra": "median 28.993 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.417,
            "unit": "ms",
            "extra": "median 5.193 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.28,
            "unit": "ms",
            "extra": "median 6.08 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.974,
            "unit": "ms",
            "extra": "median 1.203 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.944,
            "unit": "ms",
            "extra": "median 1.178 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.48,
            "unit": "ms",
            "extra": "median 0.938 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "07a0c7833223709bd478091093a1bf4a64cd7c33",
          "message": "feat(content): facet filter panel in the content browser (#885)\n\nAdd a public /content page that lists entries by kind and narrows them\nwith the kind's facet definitions through the shared filter panel. The\nkinds and filters live in the URL, so a filtered list is a link that\nsurvives reload, back and forward. Filtering runs over the cached\nbundles, so it works offline.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:09:59+10:00",
          "tree_id": "01ee6cbfe20343a38536ea3d6baff4c4ec7ad0cb",
          "url": "https://github.com/DavidDudson/pioneer/commit/07a0c7833223709bd478091093a1bf4a64cd7c33"
        },
        "date": 1792069902581,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 22.348,
            "unit": "ms",
            "extra": "median 24.613 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 31.257,
            "unit": "ms",
            "extra": "median 33.373 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 24.49,
            "unit": "ms",
            "extra": "median 25.702 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 20.489,
            "unit": "ms",
            "extra": "median 22.882 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 25.101,
            "unit": "ms",
            "extra": "median 26.488 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 23.242,
            "unit": "ms",
            "extra": "median 25.046 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.723,
            "unit": "ms",
            "extra": "median 25.937 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.959,
            "unit": "ms",
            "extra": "median 23.619 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 22.165,
            "unit": "ms",
            "extra": "median 24.001 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 22.746,
            "unit": "ms",
            "extra": "median 24.827 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.181,
            "unit": "ms",
            "extra": "median 28.608 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 25.509,
            "unit": "ms",
            "extra": "median 27.358 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 22,
            "unit": "ms",
            "extra": "median 23.341 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.878,
            "unit": "ms",
            "extra": "median 25.515 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.443,
            "unit": "ms",
            "extra": "median 23.211 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 29.888,
            "unit": "ms",
            "extra": "median 31.863 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 20.763,
            "unit": "ms",
            "extra": "median 22.409 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.611,
            "unit": "ms",
            "extra": "median 31.759 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.438,
            "unit": "ms",
            "extra": "median 5.179 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.255,
            "unit": "ms",
            "extra": "median 5.301 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.073,
            "unit": "ms",
            "extra": "median 1.222 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.981,
            "unit": "ms",
            "extra": "median 1.217 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.416,
            "unit": "ms",
            "extra": "median 1.013 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "168539006091d1c962a538fd3affdb96fcf649d3",
          "message": "feat(importer): import Secrets of Magic and Rage of Elements as legacy OGL (#888)\n\n* feat(importer): resolve Foundry's legacy speed rune key to Quickstrike\n\nRefs #773\n\n* feat(content): import Secrets of Magic and Rage of Elements as legacy OGL\n\nAdds both pre-remaster Open Game License books to OGL_BOOKS and the book\nregistry (remaster: false, so the UI can mark them legacy), imports them\nonce at pf2e-8.6.0 into secrets-of-magic (243 entries) and rage-of-elements\n(611 entries) packs, and adds their Section 15 notices to the Legal page.\nThe Rage of Elements notice is drawn from Paizo's announcement credits, not\nthe printed copyright page, and needs checking against the book.\n\nRe-imports Treasure Vault so wand, scroll and speed-rune references resolve.\nbane, greaterImpactful and frigid-flurry (Impossible Magic) stay in its\nbacklog.\n\nRefs #773\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:13:55+10:00",
          "tree_id": "9ede31e4bbbaaec75dc99becad1090d3c8d8c6e0",
          "url": "https://github.com/DavidDudson/pioneer/commit/168539006091d1c962a538fd3affdb96fcf649d3"
        },
        "date": 1792070127559,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 13.605,
            "unit": "ms",
            "extra": "median 16.545 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 17.165,
            "unit": "ms",
            "extra": "median 19.773 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 13.309,
            "unit": "ms",
            "extra": "median 14.58 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 11.969,
            "unit": "ms",
            "extra": "median 13.263 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 14.868,
            "unit": "ms",
            "extra": "median 15.958 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 13.922,
            "unit": "ms",
            "extra": "median 15.965 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 14.655,
            "unit": "ms",
            "extra": "median 15.74 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 13.388,
            "unit": "ms",
            "extra": "median 14.916 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 13.511,
            "unit": "ms",
            "extra": "median 16.339 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 15.768,
            "unit": "ms",
            "extra": "median 19.114 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 15.451,
            "unit": "ms",
            "extra": "median 17.59 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 14.034,
            "unit": "ms",
            "extra": "median 16.538 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 12.018,
            "unit": "ms",
            "extra": "median 13.006 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 13.241,
            "unit": "ms",
            "extra": "median 14.519 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 12.378,
            "unit": "ms",
            "extra": "median 13.873 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 16.988,
            "unit": "ms",
            "extra": "median 18.333 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 11.853,
            "unit": "ms",
            "extra": "median 12.422 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 17.498,
            "unit": "ms",
            "extra": "median 19.141 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.383,
            "unit": "ms",
            "extra": "median 4.522 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.217,
            "unit": "ms",
            "extra": "median 3.958 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.687,
            "unit": "ms",
            "extra": "median 0.893 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.571,
            "unit": "ms",
            "extra": "median 0.7 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.279,
            "unit": "ms",
            "extra": "median 0.599 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "5dc140164feaf35f0e9c0ef9ce93113bc7581af9",
          "message": "feat(spellcasting): sorcerer and oracle repertoire gifts (#889)\n\nAdd a RepertoireSpells rule element (ADR-0062): a bloodline's sorcerous\ngifts and a mystery's granted spells fill the first repertoire slot of\ntheir rank, so the repertoire stays as big as the slot table, as the\nPlayer Core 2 sorcerer text says. A gift is offered for the signature\nslot of its rank like any repertoire spell.\n\nThe importer now gives Player Core 2's sorcerer (entry per bloodline,\ndraconic exemplar and elemental influence choices) and oracle spontaneous\nentries, a slot table one slot above the bard's, Signature Spells and\nthe gifts. The sheet shows a granted slot as read-only text.\n\nRefs #593\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:22:21+10:00",
          "tree_id": "a9b69a891a0fde4b489d98f9e89b2c46e725429a",
          "url": "https://github.com/DavidDudson/pioneer/commit/5dc140164feaf35f0e9c0ef9ce93113bc7581af9"
        },
        "date": 1792070657341,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.786,
            "unit": "ms",
            "extra": "median 22.946 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.396,
            "unit": "ms",
            "extra": "median 32.288 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 22.388,
            "unit": "ms",
            "extra": "median 25.091 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 20.603,
            "unit": "ms",
            "extra": "median 23.166 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 25.385,
            "unit": "ms",
            "extra": "median 27.343 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 24.45,
            "unit": "ms",
            "extra": "median 26.577 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.016,
            "unit": "ms",
            "extra": "median 26.375 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.213,
            "unit": "ms",
            "extra": "median 24.36 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 22.368,
            "unit": "ms",
            "extra": "median 25.508 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 27.928,
            "unit": "ms",
            "extra": "median 30.253 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.646,
            "unit": "ms",
            "extra": "median 30.296 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.453,
            "unit": "ms",
            "extra": "median 28.863 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 21.451,
            "unit": "ms",
            "extra": "median 24.581 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 24.927,
            "unit": "ms",
            "extra": "median 27.312 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.502,
            "unit": "ms",
            "extra": "median 23.689 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.834,
            "unit": "ms",
            "extra": "median 31.087 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.118,
            "unit": "ms",
            "extra": "median 20.512 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 28.681,
            "unit": "ms",
            "extra": "median 31.38 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.395,
            "unit": "ms",
            "extra": "median 6.416 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.21,
            "unit": "ms",
            "extra": "median 6.101 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.855,
            "unit": "ms",
            "extra": "median 1.082 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.021,
            "unit": "ms",
            "extra": "median 1.322 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.542,
            "unit": "ms",
            "extra": "median 1.079 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "793764108711be31e81f9d79d8d09d1e09d5bbe6",
          "message": "feat(play): effects with durations and sources (#890)\n\n* feat(play): effects with durations and sources in play state\n\nAdds effects to PlayState with applyEffect, removeEffect, setEffectRemaining and\nsetEffectBadge. Duration, expiry and counter badge start from the effect's\ncontent; the engine puts active effects in the effective set.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(sheet): apply and list effects with source, rounds and badge\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(play): split effect commands out and tidy lint\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(play): gate unrollable badges and guard setEffectRemaining\n\nDisable Apply when a formula badge is not a plain dice expression, leave\neffects with no clock alone in setEffectRemaining, and correct the\neffectRoots doc: the hop carries no badge yet.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* chore(sheet): stop exporting EffectSourceView\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test(play): brand the ally name in the play state DB test\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:23:19+10:00",
          "tree_id": "a2a9745161dce2355c3b63cd133e191b5d59c995",
          "url": "https://github.com/DavidDudson/pioneer/commit/793764108711be31e81f9d79d8d09d1e09d5bbe6"
        },
        "date": 1792070776932,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.853,
            "unit": "ms",
            "extra": "median 22.841 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.423,
            "unit": "ms",
            "extra": "median 31.491 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 21.811,
            "unit": "ms",
            "extra": "median 25.185 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.738,
            "unit": "ms",
            "extra": "median 21.754 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 29.61,
            "unit": "ms",
            "extra": "median 31.04 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 26.92,
            "unit": "ms",
            "extra": "median 29.83 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 27.263,
            "unit": "ms",
            "extra": "median 30.03 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 26.35,
            "unit": "ms",
            "extra": "median 27.93 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 25.19,
            "unit": "ms",
            "extra": "median 27.409 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 30.883,
            "unit": "ms",
            "extra": "median 33.572 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 30.743,
            "unit": "ms",
            "extra": "median 32.397 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.854,
            "unit": "ms",
            "extra": "median 28.257 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.209,
            "unit": "ms",
            "extra": "median 21.293 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.151,
            "unit": "ms",
            "extra": "median 24.763 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.735,
            "unit": "ms",
            "extra": "median 23.391 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.364,
            "unit": "ms",
            "extra": "median 30.456 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.212,
            "unit": "ms",
            "extra": "median 20.391 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.23,
            "unit": "ms",
            "extra": "median 31.094 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.31,
            "unit": "ms",
            "extra": "median 6.283 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.44,
            "unit": "ms",
            "extra": "median 6.494 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.883,
            "unit": "ms",
            "extra": "median 1.09 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.969,
            "unit": "ms",
            "extra": "median 1.234 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.512,
            "unit": "ms",
            "extra": "median 1.097 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "4a3bb350712db66d3dbffb28bde0147ced79d9b8",
          "message": "feat(content): sharded description bundles and entry texts (#894)\n\nDescriptions reach the browser as content-hashed shards per kind,\nlisted in the manifest and fetched lazily by ContentLoader.description.\ncontent_entry_texts holds per-locale text, seeded from official packs\n(en only; #693 adds locales).\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:40:47+10:00",
          "tree_id": "4b9bdec1b3c40307d8aaddc73231d6994dc7eca5",
          "url": "https://github.com/DavidDudson/pioneer/commit/4a3bb350712db66d3dbffb28bde0147ced79d9b8"
        },
        "date": 1792071767602,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 16.876,
            "unit": "ms",
            "extra": "median 19.52 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 24.424,
            "unit": "ms",
            "extra": "median 26.372 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 18.609,
            "unit": "ms",
            "extra": "median 20.526 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 16.456,
            "unit": "ms",
            "extra": "median 18.855 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 19.815,
            "unit": "ms",
            "extra": "median 22.768 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 18.088,
            "unit": "ms",
            "extra": "median 19.313 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 18.455,
            "unit": "ms",
            "extra": "median 19.992 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 17.589,
            "unit": "ms",
            "extra": "median 18.481 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 17.57,
            "unit": "ms",
            "extra": "median 19.053 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 23.161,
            "unit": "ms",
            "extra": "median 26.149 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 22.209,
            "unit": "ms",
            "extra": "median 25.412 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 20.025,
            "unit": "ms",
            "extra": "median 22.43 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 16.469,
            "unit": "ms",
            "extra": "median 17.316 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 19.739,
            "unit": "ms",
            "extra": "median 21.661 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 17.795,
            "unit": "ms",
            "extra": "median 19.634 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 23.297,
            "unit": "ms",
            "extra": "median 26.377 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 16.057,
            "unit": "ms",
            "extra": "median 18.207 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 24.239,
            "unit": "ms",
            "extra": "median 26.344 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.029,
            "unit": "ms",
            "extra": "median 5.351 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.861,
            "unit": "ms",
            "extra": "median 4.86 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.67,
            "unit": "ms",
            "extra": "median 0.761 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.781,
            "unit": "ms",
            "extra": "median 1.079 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.38,
            "unit": "ms",
            "extra": "median 0.796 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "distinct": false,
          "id": "3a0f4152d15ab6d1581c99aa430fd74d96fb0bc7",
          "message": "feat(content): import Tian Xia Character Guide and Dark Archive (#891)\n\nImports Lost Omens Tian Xia Character Guide and Dark Archive (Remastered)\nonce at pf2e-8.6.0 into their own packs, for the Cultivator and Sleepwalker\ndedications Briar Rose uses. Both are ORC; Dark Archive (Remastered) gets a\ncredit naming Paizo alone.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:49:28+10:00",
          "tree_id": "523b82591e2c1d210fd8409179e88ec7de59c572",
          "url": "https://github.com/DavidDudson/pioneer/commit/3a0f4152d15ab6d1581c99aa430fd74d96fb0bc7"
        },
        "date": 1792072302772,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 24.508,
            "unit": "ms",
            "extra": "median 27.51 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 34.165,
            "unit": "ms",
            "extra": "median 35.954 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 26.772,
            "unit": "ms",
            "extra": "median 28.649 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 22.796,
            "unit": "ms",
            "extra": "median 25.425 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 27.83,
            "unit": "ms",
            "extra": "median 29.542 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 26.246,
            "unit": "ms",
            "extra": "median 28.725 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 27.074,
            "unit": "ms",
            "extra": "median 29.095 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 24.532,
            "unit": "ms",
            "extra": "median 26.601 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.949,
            "unit": "ms",
            "extra": "median 25.936 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 28.961,
            "unit": "ms",
            "extra": "median 30.631 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 29.331,
            "unit": "ms",
            "extra": "median 31.437 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.119,
            "unit": "ms",
            "extra": "median 29.934 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 23.19,
            "unit": "ms",
            "extra": "median 25.248 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 26.704,
            "unit": "ms",
            "extra": "median 29.696 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 25.906,
            "unit": "ms",
            "extra": "median 27.324 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 31.579,
            "unit": "ms",
            "extra": "median 32.991 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 21.526,
            "unit": "ms",
            "extra": "median 23.382 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 31.699,
            "unit": "ms",
            "extra": "median 33.873 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.891,
            "unit": "ms",
            "extra": "median 7.367 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.752,
            "unit": "ms",
            "extra": "median 6.567 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.016,
            "unit": "ms",
            "extra": "median 1.178 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.126,
            "unit": "ms",
            "extra": "median 1.456 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.565,
            "unit": "ms",
            "extra": "median 1.118 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "ea554e3e20032288f776144c9dd3d1d4f22f6c09",
          "message": "feat(content): import Character Guide and Impossible Lands (#892)\n\nImports Lost Omens Character Guide and Lost Omens Impossible Lands once at\npf2e-8.6.0 into their own packs, for Mordred's Knight Vigilant Dedication\nand Fey Influence. Both are pre-remaster OGL books, so they join OGL_BOOKS\nwith their Section 15 notices copied from Foundry's OpenGameLicense.md.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:52:10+10:00",
          "tree_id": "bf3fca741121512b83e069ea88259fc9f96221a0",
          "url": "https://github.com/DavidDudson/pioneer/commit/ea554e3e20032288f776144c9dd3d1d4f22f6c09"
        },
        "date": 1792072495821,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.351,
            "unit": "ms",
            "extra": "median 22.592 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 28.921,
            "unit": "ms",
            "extra": "median 31.001 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 21.671,
            "unit": "ms",
            "extra": "median 23.477 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.205,
            "unit": "ms",
            "extra": "median 20.549 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 23.366,
            "unit": "ms",
            "extra": "median 25.263 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 22.234,
            "unit": "ms",
            "extra": "median 24.366 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 22.862,
            "unit": "ms",
            "extra": "median 25.156 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.325,
            "unit": "ms",
            "extra": "median 22.749 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 20.981,
            "unit": "ms",
            "extra": "median 22.581 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 25.888,
            "unit": "ms",
            "extra": "median 27.72 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 25.741,
            "unit": "ms",
            "extra": "median 27.049 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 24.278,
            "unit": "ms",
            "extra": "median 26.397 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.599,
            "unit": "ms",
            "extra": "median 22.232 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.208,
            "unit": "ms",
            "extra": "median 25.025 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.2,
            "unit": "ms",
            "extra": "median 22.462 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.246,
            "unit": "ms",
            "extra": "median 29.778 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 18.804,
            "unit": "ms",
            "extra": "median 19.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 28.486,
            "unit": "ms",
            "extra": "median 29.549 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.204,
            "unit": "ms",
            "extra": "median 6.56 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.086,
            "unit": "ms",
            "extra": "median 6.1 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.925,
            "unit": "ms",
            "extra": "median 1.06 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.999,
            "unit": "ms",
            "extra": "median 1.236 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.482,
            "unit": "ms",
            "extra": "median 1.063 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "9ef5c97a42b56d1f2ce17bd9667efe7d138883cc",
          "message": "test(play): cover rest needs branches and condition easing properties (#898)\n\nTable tests for the rest branches of the needs* predicates and for\nisCountingCommand. Property tests build fatigued and drained from a content\npack's recovery data, assert Rest lowers doomed and drained to a floor of 0 and\nleaves no fatigued, and that Rest and Refocus are not idempotent.\n\nCloses #711\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-15T23:57:03+10:00",
          "tree_id": "7a0b3a0e10f66210ecfff9340a0e88c730d24892",
          "url": "https://github.com/DavidDudson/pioneer/commit/9ef5c97a42b56d1f2ce17bd9667efe7d138883cc"
        },
        "date": 1792073040719,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 11.516,
            "unit": "ms",
            "extra": "median 12.937 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 15.778,
            "unit": "ms",
            "extra": "median 17.643 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 12.352,
            "unit": "ms",
            "extra": "median 13.59 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 11.232,
            "unit": "ms",
            "extra": "median 12.281 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 13.624,
            "unit": "ms",
            "extra": "median 14.774 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 13.579,
            "unit": "ms",
            "extra": "median 15.681 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 13.581,
            "unit": "ms",
            "extra": "median 14.378 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 12.046,
            "unit": "ms",
            "extra": "median 12.872 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 12.384,
            "unit": "ms",
            "extra": "median 13.053 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 14.962,
            "unit": "ms",
            "extra": "median 16.98 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 14.652,
            "unit": "ms",
            "extra": "median 16.396 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 13.576,
            "unit": "ms",
            "extra": "median 14.227 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 11.473,
            "unit": "ms",
            "extra": "median 12.522 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 13.136,
            "unit": "ms",
            "extra": "median 13.982 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 12.05,
            "unit": "ms",
            "extra": "median 12.659 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 16.178,
            "unit": "ms",
            "extra": "median 18.162 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 11.066,
            "unit": "ms",
            "extra": "median 11.606 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 16.001,
            "unit": "ms",
            "extra": "median 16.744 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.113,
            "unit": "ms",
            "extra": "median 3.725 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.126,
            "unit": "ms",
            "extra": "median 3.769 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.466,
            "unit": "ms",
            "extra": "median 0.587 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.544,
            "unit": "ms",
            "extra": "median 0.642 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.278,
            "unit": "ms",
            "extra": "median 0.576 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "70915e71e880661e0effe5c3b01a309e0d1d6d6e",
          "message": "feat(spellcasting): repertoire count element (#901)\n\nA spontaneous repertoire was sized by its slots, so a 19th-level\nbard got one 10th-rank spell from Magnum Opus instead of two.\n\nRepertoireCount adds repertoire spells of a rank apart from slots\n(ADR-0063). Below 10th rank it adds to the slot count; at 10th rank\nslots never size the repertoire, so only counts do. Perfect Encore\nand the sorcerer and oracle equivalents add a slot and no spell.\nMagnum Opus, Bloodline Paragon and Oracular Clarity carry a count\nof two. A 10th-rank repertoire slot offers only 10th-rank spells.\n\nDivine Access is not covered; it needs rankless slots and a deity\npick and follows in a stacked PR.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T00:02:59+10:00",
          "tree_id": "19216429278c672f17e9613e90a02ce422ceed10",
          "url": "https://github.com/DavidDudson/pioneer/commit/70915e71e880661e0effe5c3b01a309e0d1d6d6e"
        },
        "date": 1792073354119,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 19.764,
            "unit": "ms",
            "extra": "median 21.093 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 26.48,
            "unit": "ms",
            "extra": "median 28.648 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 20.806,
            "unit": "ms",
            "extra": "median 22.214 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 18.569,
            "unit": "ms",
            "extra": "median 19.482 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 22.249,
            "unit": "ms",
            "extra": "median 22.944 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 21.821,
            "unit": "ms",
            "extra": "median 23.298 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 21.932,
            "unit": "ms",
            "extra": "median 22.715 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.016,
            "unit": "ms",
            "extra": "median 21.865 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 20.278,
            "unit": "ms",
            "extra": "median 21.307 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 24.754,
            "unit": "ms",
            "extra": "median 25.438 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 23.946,
            "unit": "ms",
            "extra": "median 25.021 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 22.3,
            "unit": "ms",
            "extra": "median 23.056 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 19.215,
            "unit": "ms",
            "extra": "median 19.993 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 22.053,
            "unit": "ms",
            "extra": "median 23.506 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 20.072,
            "unit": "ms",
            "extra": "median 21.253 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 25.679,
            "unit": "ms",
            "extra": "median 26.856 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 18.217,
            "unit": "ms",
            "extra": "median 18.949 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 26.324,
            "unit": "ms",
            "extra": "median 27.777 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.936,
            "unit": "ms",
            "extra": "median 6.151 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.859,
            "unit": "ms",
            "extra": "median 5.842 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.82,
            "unit": "ms",
            "extra": "median 1.008 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.847,
            "unit": "ms",
            "extra": "median 1.078 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.401,
            "unit": "ms",
            "extra": "median 0.886 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "71ec4ca20a8f8e0c2ae5838817e4009895c938e7",
          "message": "feat(content): import Impossible Magic from Foundry (#896)\n\n* feat(content): import Impossible Magic from Foundry\n\nRegisters Impossible Magic (ORC, 2026-07-30) and imports it once at\npf2e-8.6.0 into an impossible-magic pack of 1251 entries, with its\nvocabulary in core-rules. Curricula for its four new wizard schools are\nderived from their description tables; a curriculum may now name another\npack's spell as pack:slug.\n\nRe-imports Treasure Vault: every spell and rune property reference now\nresolves.\n\nIts Legal page credit is Paizo Inc. alone, as Foundry's ORC file has no\nentry for the book yet.\n\nRefs #773\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(legal): credit Rage of Elements once, from Foundry's ORC notice\n\nFoundry's ORCLicense.md already lists Rage of Elements with its printed\ncredits, which the Legal page carries. Drops the duplicate Section 15 line\ndrawn from Paizo's blog post, added in the Secrets of Magic and Rage of\nElements import.\n\n* refactor(catalog): load Impossible Magic from orc-packs\n\njson-packs.ts hit the 300-line cap after the rebase onto main.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T00:06:24+10:00",
          "tree_id": "697b6ad351905e19fb129c7381b8ace4adb0b018",
          "url": "https://github.com/DavidDudson/pioneer/commit/71ec4ca20a8f8e0c2ae5838817e4009895c938e7"
        },
        "date": 1792073732369,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 12.387,
            "unit": "ms",
            "extra": "median 14.18 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 17.106,
            "unit": "ms",
            "extra": "median 19.388 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 13.627,
            "unit": "ms",
            "extra": "median 15.67 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 11.826,
            "unit": "ms",
            "extra": "median 12.998 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 14.85,
            "unit": "ms",
            "extra": "median 17.131 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 14.465,
            "unit": "ms",
            "extra": "median 16.282 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 14.199,
            "unit": "ms",
            "extra": "median 16.538 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 12.951,
            "unit": "ms",
            "extra": "median 14.849 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 13.001,
            "unit": "ms",
            "extra": "median 15.591 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 17.327,
            "unit": "ms",
            "extra": "median 20.099 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 15.776,
            "unit": "ms",
            "extra": "median 17.972 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 14.118,
            "unit": "ms",
            "extra": "median 16.582 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 12.507,
            "unit": "ms",
            "extra": "median 14.69 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 13.978,
            "unit": "ms",
            "extra": "median 15.745 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 12.543,
            "unit": "ms",
            "extra": "median 14.534 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 21.17,
            "unit": "ms",
            "extra": "median 24.305 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 13.141,
            "unit": "ms",
            "extra": "median 15.801 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 18.849,
            "unit": "ms",
            "extra": "median 21.975 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.549,
            "unit": "ms",
            "extra": "median 4.336 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.828,
            "unit": "ms",
            "extra": "median 4.784 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.559,
            "unit": "ms",
            "extra": "median 0.762 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.566,
            "unit": "ms",
            "extra": "median 0.757 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.282,
            "unit": "ms",
            "extra": "median 0.589 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "7d039ee4754f1ad688f2c5f22b5f8c1f4edab416",
          "message": "feat(interop): match Pathbuilder feats and features to related kinds (#903)\n\nPathbuilder files heritages, ancestry features and actions among a\ncharacter's feats and class features. Index those kinds too, so\nVigilant Goloma, Eyes in Back and Daydream Trance match.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T00:09:58+10:00",
          "tree_id": "2085f1113a29ebf2f3d0e55fef7a06705bee445a",
          "url": "https://github.com/DavidDudson/pioneer/commit/7d039ee4754f1ad688f2c5f22b5f8c1f4edab416"
        },
        "date": 1792073986720,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 18.104,
            "unit": "ms",
            "extra": "median 20.187 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 25.866,
            "unit": "ms",
            "extra": "median 28.817 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 18.62,
            "unit": "ms",
            "extra": "median 22.047 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 16.751,
            "unit": "ms",
            "extra": "median 19.656 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 20.492,
            "unit": "ms",
            "extra": "median 22.213 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 19.74,
            "unit": "ms",
            "extra": "median 21.117 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 20.322,
            "unit": "ms",
            "extra": "median 21.369 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 18.229,
            "unit": "ms",
            "extra": "median 19.075 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 19.486,
            "unit": "ms",
            "extra": "median 20.748 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 22.75,
            "unit": "ms",
            "extra": "median 24.7 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 22.116,
            "unit": "ms",
            "extra": "median 24.343 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 22.527,
            "unit": "ms",
            "extra": "median 25.66 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 17.592,
            "unit": "ms",
            "extra": "median 20.429 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 19.398,
            "unit": "ms",
            "extra": "median 20.898 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 17.863,
            "unit": "ms",
            "extra": "median 20.137 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 23.893,
            "unit": "ms",
            "extra": "median 26.72 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 16.357,
            "unit": "ms",
            "extra": "median 17.845 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 24.077,
            "unit": "ms",
            "extra": "median 26.403 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.563,
            "unit": "ms",
            "extra": "median 6 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.874,
            "unit": "ms",
            "extra": "median 5.875 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.771,
            "unit": "ms",
            "extra": "median 0.958 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.788,
            "unit": "ms",
            "extra": "median 0.984 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.473,
            "unit": "ms",
            "extra": "median 0.878 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "26d2e51cd384d94793f0aadf64fcd0609d81baa6",
          "message": "feat(homebrew): archive and restore a homebrew pack (closes #883) (#908)\n\n* feat(homebrew): archive and restore a homebrew pack\n\nHomebrew packs are archived, never deleted (ADR-0062). Adds archived_at,\nPOST /homebrew/packs/:id/archive and /restore, GET /homebrew/packs/archived,\nowner only. An archived pack reads as missing, is out of the pack directory\nand so no longer offered or in force for characters and campaigns, is left\nout of loaded registries, exports and imports, and is audited by command.\nA pack other live packs extend can't be archived, and one that extends an\narchived pack can't be restored. Owner FK to users is restrict and\narchive.protect blocks DELETE on content_packs.\n\nCloses #883\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(homebrew): recheck visibility on restore, serialise archive with the graph\n\nRestore now refuses a pack that would come back wider than a pack it\nextends, and archive/restore take the dependency graph advisory lock so\na live pack is never left extending an archived one. Adds tests for both,\nfor archived packs dropping out of stored content, and for a campaign\nno longer listing an archived pack.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test(api): archive the ally character instead of deleting it\n\nCharacters cannot be deleted since the archive guard; the ally test\nadded on main deleted one.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:25:51+10:00",
          "tree_id": "fcac32b9ccacfb3789a193a0b9545f937753307c",
          "url": "https://github.com/DavidDudson/pioneer/commit/26d2e51cd384d94793f0aadf64fcd0609d81baa6"
        },
        "date": 1792099676434,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 21.145,
            "unit": "ms",
            "extra": "median 22.67 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.012,
            "unit": "ms",
            "extra": "median 31.298 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 22.215,
            "unit": "ms",
            "extra": "median 23.237 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.354,
            "unit": "ms",
            "extra": "median 20.245 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 23.522,
            "unit": "ms",
            "extra": "median 24.598 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 23.195,
            "unit": "ms",
            "extra": "median 24.067 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.359,
            "unit": "ms",
            "extra": "median 24.814 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.685,
            "unit": "ms",
            "extra": "median 22.592 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 21.097,
            "unit": "ms",
            "extra": "median 21.912 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 25.956,
            "unit": "ms",
            "extra": "median 26.958 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 25.531,
            "unit": "ms",
            "extra": "median 27.498 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.314,
            "unit": "ms",
            "extra": "median 24.61 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 19.797,
            "unit": "ms",
            "extra": "median 21.126 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.194,
            "unit": "ms",
            "extra": "median 25.724 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 20.742,
            "unit": "ms",
            "extra": "median 21.781 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 27.292,
            "unit": "ms",
            "extra": "median 28.699 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 18.922,
            "unit": "ms",
            "extra": "median 19.963 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 28.123,
            "unit": "ms",
            "extra": "median 29.853 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.415,
            "unit": "ms",
            "extra": "median 7.013 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.381,
            "unit": "ms",
            "extra": "median 6.139 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.798,
            "unit": "ms",
            "extra": "median 1.016 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.955,
            "unit": "ms",
            "extra": "median 1.131 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.504,
            "unit": "ms",
            "extra": "median 1.066 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "49bc5fa1fc3001486f90802192d545dbd42375c1",
          "message": "feat(interop): import Pathbuilder inventory, runes and coins (#912)\n\nMatched equipment, weapons and armour become inventory lines with quantity,\nworn armour, investment (only for investable content, within the limit),\nfundamental runes, known property runes and the player's name for a weapon.\nCoins import exactly. Unmatched items stay in the report.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:28:00+10:00",
          "tree_id": "7bf9c98a29aaa504fa105bba3dc4f11832e4e347",
          "url": "https://github.com/DavidDudson/pioneer/commit/49bc5fa1fc3001486f90802192d545dbd42375c1"
        },
        "date": 1792099805828,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 23.843,
            "unit": "ms",
            "extra": "median 26.922 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 34.744,
            "unit": "ms",
            "extra": "median 37.079 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 25.814,
            "unit": "ms",
            "extra": "median 27.61 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 23.521,
            "unit": "ms",
            "extra": "median 26.877 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 27.523,
            "unit": "ms",
            "extra": "median 31.168 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 27.436,
            "unit": "ms",
            "extra": "median 29.747 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 27.474,
            "unit": "ms",
            "extra": "median 29.889 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 25.049,
            "unit": "ms",
            "extra": "median 26.969 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 25.014,
            "unit": "ms",
            "extra": "median 29.36 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 30.495,
            "unit": "ms",
            "extra": "median 32.982 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 29.922,
            "unit": "ms",
            "extra": "median 32.321 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 27.285,
            "unit": "ms",
            "extra": "median 29.49 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 22.237,
            "unit": "ms",
            "extra": "median 25.252 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 27.07,
            "unit": "ms",
            "extra": "median 30.158 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.423,
            "unit": "ms",
            "extra": "median 25.232 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 30.263,
            "unit": "ms",
            "extra": "median 31.953 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 20.124,
            "unit": "ms",
            "extra": "median 21.657 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 31.07,
            "unit": "ms",
            "extra": "median 33.714 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.815,
            "unit": "ms",
            "extra": "median 6.875 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.431,
            "unit": "ms",
            "extra": "median 6.895 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.987,
            "unit": "ms",
            "extra": "median 1.188 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.996,
            "unit": "ms",
            "extra": "median 1.225 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.563,
            "unit": "ms",
            "extra": "median 1.014 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "7fef38ba5de9ba09a08b65bd1da7194a38614501",
          "message": "feat(spellcasting): oracle divine access spells (#911)\n\nDivine Access lets an oracle add up to three spells of a deity that\ngrants one of its mystery's domains, apart from its slots, each\nlearned at its own rank (ADR-0063).\n\nRepertoireDeitySpells reads the deity a ChoiceSet stored and gives\nthe entry that many repertoire slots, keyed by the choice, offering\nthe deity's spells up to the entry's highest slot rank and reading\nat the spell's rank once filled. Each oracle mystery asks the deity\nfrom 11th level, offering deities with a primary or alternate domain\nof the mystery. Deities now expose their domains to a query as\nitem roll options.\n\nRefs the repertoire count work in the previous PR for #599.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:28:18+10:00",
          "tree_id": "274304a2dcaf6023b3f35bc1d51b25c6280d2b59",
          "url": "https://github.com/DavidDudson/pioneer/commit/7fef38ba5de9ba09a08b65bd1da7194a38614501"
        },
        "date": 1792099930276,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.44,
            "unit": "ms",
            "extra": "median 25.308 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.094,
            "unit": "ms",
            "extra": "median 33.383 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 22.753,
            "unit": "ms",
            "extra": "median 25.319 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.584,
            "unit": "ms",
            "extra": "median 21.35 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 24.179,
            "unit": "ms",
            "extra": "median 27.775 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 23.337,
            "unit": "ms",
            "extra": "median 26.067 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.451,
            "unit": "ms",
            "extra": "median 25.972 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.619,
            "unit": "ms",
            "extra": "median 23.768 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 20.852,
            "unit": "ms",
            "extra": "median 22.728 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 27.688,
            "unit": "ms",
            "extra": "median 30.487 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 25.889,
            "unit": "ms",
            "extra": "median 27.802 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.612,
            "unit": "ms",
            "extra": "median 26.202 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.101,
            "unit": "ms",
            "extra": "median 21.767 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.67,
            "unit": "ms",
            "extra": "median 25.892 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.544,
            "unit": "ms",
            "extra": "median 23.95 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.647,
            "unit": "ms",
            "extra": "median 31.02 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.069,
            "unit": "ms",
            "extra": "median 20.302 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.357,
            "unit": "ms",
            "extra": "median 31.549 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.439,
            "unit": "ms",
            "extra": "median 6.716 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.435,
            "unit": "ms",
            "extra": "median 6.264 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.847,
            "unit": "ms",
            "extra": "median 1.118 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.076,
            "unit": "ms",
            "extra": "median 1.294 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.558,
            "unit": "ms",
            "extra": "median 1.094 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "eaeb7410de1bdff2f3ac91a3fa2e07ea619a19a2",
          "message": "feat(play): cast a wand and overcharge it (#914)\n\n* feat(play): cast a wand and overcharge it\n\nA held wand casts its spell once a day at the wand's rank, with the entry\nwhose list has the spell. Once that is spent it can be overcharged: a DC 10\nflat check rolled through the dice library. A pass casts the spell and\nbreaks the wand; a failure, or an overcharge already made today, destroys\nit. Broken is inventory state that outlasts daily preparations until the\nplayer marks the wand repaired.\n\nThe cast and the overcharge are counted uses that reset on the day. A\nbreaking or destroying overcharge writes the play state and the inventory\nin one transaction.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(sheet): cast and overcharge a held wand\n\nThe Encounter tab lists each held wand with its cast for the day, and\nrolls the DC 10 flat check of an overcharge on the sheet. The d20, the DC\nand what the overcharge would come to show before the player confirms.\nA broken wand offers to be marked repaired. Daily preparations name the\nwand casts and overcharged casts that come back.\n\nThe wand's cast counts, the broken inventory state and the one-write\novercharge are covered by domain, service, repository, route and sheet\ntests. Docs describe the combined write and the broken state.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* refactor(play): move the play edit checks out of the service\n\nThe merge with main pushed play-service.ts over the file line limit.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:36:49+10:00",
          "tree_id": "37272c57f44f9d62958e0ffeb4b6b81b10e73a9d",
          "url": "https://github.com/DavidDudson/pioneer/commit/eaeb7410de1bdff2f3ac91a3fa2e07ea619a19a2"
        },
        "date": 1792100336743,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 24.669,
            "unit": "ms",
            "extra": "median 29.261 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 32.112,
            "unit": "ms",
            "extra": "median 35.355 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 23.108,
            "unit": "ms",
            "extra": "median 25.395 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 20.942,
            "unit": "ms",
            "extra": "median 23.378 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 27.967,
            "unit": "ms",
            "extra": "median 30.932 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 24.882,
            "unit": "ms",
            "extra": "median 29.891 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 24.37,
            "unit": "ms",
            "extra": "median 25.931 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.049,
            "unit": "ms",
            "extra": "median 25.518 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.499,
            "unit": "ms",
            "extra": "median 25.517 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 27.493,
            "unit": "ms",
            "extra": "median 30.402 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.981,
            "unit": "ms",
            "extra": "median 30.146 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.949,
            "unit": "ms",
            "extra": "median 29.289 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 22.9,
            "unit": "ms",
            "extra": "median 24.484 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 26.558,
            "unit": "ms",
            "extra": "median 29.452 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 24.58,
            "unit": "ms",
            "extra": "median 26.328 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 29.537,
            "unit": "ms",
            "extra": "median 32.431 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 21.647,
            "unit": "ms",
            "extra": "median 23.748 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 30.509,
            "unit": "ms",
            "extra": "median 32.621 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.675,
            "unit": "ms",
            "extra": "median 6.484 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.768,
            "unit": "ms",
            "extra": "median 6.644 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.818,
            "unit": "ms",
            "extra": "median 1.044 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.969,
            "unit": "ms",
            "extra": "median 1.199 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.476,
            "unit": "ms",
            "extra": "median 0.968 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "881035e8e7dbad020846e279cf68e37b4ac9b8fb",
          "message": "fix(interop): cap Pathbuilder property runes at what an item holds (#915)\n\nMordred's Caliburn lists seven property runes; the inventory schema holds\nfive, so the import threw. Etch the first five.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:39:44+10:00",
          "tree_id": "95afda6c02da754a2cbf5212d4da1bfad6fc23e5",
          "url": "https://github.com/DavidDudson/pioneer/commit/881035e8e7dbad020846e279cf68e37b4ac9b8fb"
        },
        "date": 1792100569658,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 15.489,
            "unit": "ms",
            "extra": "median 16.918 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 21.142,
            "unit": "ms",
            "extra": "median 22.367 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 16.33,
            "unit": "ms",
            "extra": "median 17.185 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 14.68,
            "unit": "ms",
            "extra": "median 15.414 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 17.378,
            "unit": "ms",
            "extra": "median 18.445 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 17.452,
            "unit": "ms",
            "extra": "median 18.51 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 17.499,
            "unit": "ms",
            "extra": "median 18.483 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 15.874,
            "unit": "ms",
            "extra": "median 16.713 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 15.482,
            "unit": "ms",
            "extra": "median 16.447 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 19.313,
            "unit": "ms",
            "extra": "median 20.516 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 19.123,
            "unit": "ms",
            "extra": "median 20.317 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 17.978,
            "unit": "ms",
            "extra": "median 19.251 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 15.472,
            "unit": "ms",
            "extra": "median 16.27 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 17.737,
            "unit": "ms",
            "extra": "median 18.99 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 16.191,
            "unit": "ms",
            "extra": "median 18.067 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 22.611,
            "unit": "ms",
            "extra": "median 24.071 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 14.848,
            "unit": "ms",
            "extra": "median 16.942 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 20.116,
            "unit": "ms",
            "extra": "median 22.077 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.425,
            "unit": "ms",
            "extra": "median 3.915 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.346,
            "unit": "ms",
            "extra": "median 3.999 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.521,
            "unit": "ms",
            "extra": "median 0.673 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.55,
            "unit": "ms",
            "extra": "median 0.672 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.283,
            "unit": "ms",
            "extra": "median 0.634 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "9f152ef2d876be3d77ad9c1f8fa5966a426e816c",
          "message": "feat(spellcasting): draconic exemplar skill (#918)\n\nA draconic sorcerer trains the skill of its exemplar: Arcana, Religion,\nOccultism or Nature. Foundry keeps the exemplar in an actor flag and the\nskill in text, so the importer adds a Proficiency per exemplar, held\nback when Crossblooded Evolution borrows the bloodline.\n\nRefs #895\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:43:20+10:00",
          "tree_id": "f2140acf8fea7c61eb4e3aa2ded8eef72acbe715",
          "url": "https://github.com/DavidDudson/pioneer/commit/9f152ef2d876be3d77ad9c1f8fa5966a426e816c"
        },
        "date": 1792100713901,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.68,
            "unit": "ms",
            "extra": "median 21.991 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 28.915,
            "unit": "ms",
            "extra": "median 30.11 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 22.034,
            "unit": "ms",
            "extra": "median 22.933 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.385,
            "unit": "ms",
            "extra": "median 20.279 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 23.146,
            "unit": "ms",
            "extra": "median 24.313 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 22.484,
            "unit": "ms",
            "extra": "median 23.755 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.172,
            "unit": "ms",
            "extra": "median 24.203 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 20.664,
            "unit": "ms",
            "extra": "median 22.131 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 21.081,
            "unit": "ms",
            "extra": "median 21.964 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 24.875,
            "unit": "ms",
            "extra": "median 26.991 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 25.57,
            "unit": "ms",
            "extra": "median 26.537 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.38,
            "unit": "ms",
            "extra": "median 24.263 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 19.897,
            "unit": "ms",
            "extra": "median 20.477 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 22.957,
            "unit": "ms",
            "extra": "median 23.983 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 20.863,
            "unit": "ms",
            "extra": "median 21.704 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 27.378,
            "unit": "ms",
            "extra": "median 28.613 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 18.684,
            "unit": "ms",
            "extra": "median 19.641 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 28.123,
            "unit": "ms",
            "extra": "median 28.99 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.363,
            "unit": "ms",
            "extra": "median 6.456 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.321,
            "unit": "ms",
            "extra": "median 6.085 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.799,
            "unit": "ms",
            "extra": "median 1.054 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.931,
            "unit": "ms",
            "extra": "median 1.201 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.501,
            "unit": "ms",
            "extra": "median 1.052 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "aa24084277a4af4dfe9720f8777b07b3d621f8b3",
          "message": "feat(content): content browser entry view (closes #872) (#916)\n\nAdd the public route /content/:kind/:slug, which shows an entry's name,\nlevel, traits, description and source line from the existing entry\npreview, rich text and source line components. References in the text\nare named and linked to their entries through RICH_TEXT_LINKS; unknown\nones show their label. The summary stands in until the description\nshard loads. The list's names now link to the entry.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:45:53+10:00",
          "tree_id": "c4b475fff41c7ea3c7ed8e6ba8a006acb4f72906",
          "url": "https://github.com/DavidDudson/pioneer/commit/aa24084277a4af4dfe9720f8777b07b3d621f8b3"
        },
        "date": 1792100856555,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 15.107,
            "unit": "ms",
            "extra": "median 18.216 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 21.575,
            "unit": "ms",
            "extra": "median 24.901 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 15.702,
            "unit": "ms",
            "extra": "median 17.923 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 12.287,
            "unit": "ms",
            "extra": "median 14.328 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 13.888,
            "unit": "ms",
            "extra": "median 18.697 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 13.962,
            "unit": "ms",
            "extra": "median 16.858 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 13.988,
            "unit": "ms",
            "extra": "median 15.991 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 12.667,
            "unit": "ms",
            "extra": "median 14.324 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 12.883,
            "unit": "ms",
            "extra": "median 16.004 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 16.292,
            "unit": "ms",
            "extra": "median 18.776 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 16.648,
            "unit": "ms",
            "extra": "median 18.623 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 15.063,
            "unit": "ms",
            "extra": "median 17.141 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 14.324,
            "unit": "ms",
            "extra": "median 16.617 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 15.427,
            "unit": "ms",
            "extra": "median 17.698 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 12.328,
            "unit": "ms",
            "extra": "median 13.853 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 18.74,
            "unit": "ms",
            "extra": "median 21.168 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 11.393,
            "unit": "ms",
            "extra": "median 13.194 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 18.861,
            "unit": "ms",
            "extra": "median 20.701 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.465,
            "unit": "ms",
            "extra": "median 4.464 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.521,
            "unit": "ms",
            "extra": "median 4.325 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.59,
            "unit": "ms",
            "extra": "median 0.773 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.544,
            "unit": "ms",
            "extra": "median 0.703 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.291,
            "unit": "ms",
            "extra": "median 0.587 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "8902834cadc1cd8754773ca183a90354a1423a0b",
          "message": "feat(rules): end-of-turn bookkeeping with persistent damage (#917)\n\nendTurn rolls each persistent damage condition through the character's\ndefences, runs the DC 15 flat check (DC 10 assisted), lowers conditions the\ncontent eases at turn end (frightened), removes turn-end effects and\nconditions, and rerolls turn-end badges. ActiveCondition gains an optional\npersistent payload; ConditionTrigger gains turn-end.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:50:49+10:00",
          "tree_id": "285d968626315bb2b3274efb67c41df29050e3c7",
          "url": "https://github.com/DavidDudson/pioneer/commit/8902834cadc1cd8754773ca183a90354a1423a0b"
        },
        "date": 1792101174363,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.25,
            "unit": "ms",
            "extra": "median 22.748 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 28.658,
            "unit": "ms",
            "extra": "median 31.01 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 21.888,
            "unit": "ms",
            "extra": "median 23.886 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.911,
            "unit": "ms",
            "extra": "median 21.204 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 23.998,
            "unit": "ms",
            "extra": "median 25.863 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 23.761,
            "unit": "ms",
            "extra": "median 26.405 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.398,
            "unit": "ms",
            "extra": "median 26.388 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.096,
            "unit": "ms",
            "extra": "median 24.255 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 20.924,
            "unit": "ms",
            "extra": "median 22.222 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 26.592,
            "unit": "ms",
            "extra": "median 28.925 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.975,
            "unit": "ms",
            "extra": "median 32.158 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 25.785,
            "unit": "ms",
            "extra": "median 29.761 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 19.893,
            "unit": "ms",
            "extra": "median 22.061 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 24.118,
            "unit": "ms",
            "extra": "median 26.444 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.157,
            "unit": "ms",
            "extra": "median 24.324 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 27.788,
            "unit": "ms",
            "extra": "median 32.97 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.294,
            "unit": "ms",
            "extra": "median 20.859 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 28.626,
            "unit": "ms",
            "extra": "median 31.931 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.613,
            "unit": "ms",
            "extra": "median 6.758 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.402,
            "unit": "ms",
            "extra": "median 6.282 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.971,
            "unit": "ms",
            "extra": "median 1.264 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.989,
            "unit": "ms",
            "extra": "median 1.375 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.531,
            "unit": "ms",
            "extra": "median 1.071 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "970ffb57acfbd19d926201a5b16f67b07cd5cd97",
          "message": "feat(content): server full-text search for the content browser (#931)\n\n* feat(content): server full-text search for the content browser\n\ncontent_entry_search holds one tsvector per entry and locale (GIN\nindexed, name weighted above description), kept current by a trigger on\ncontent_entries so the seed and homebrew imports need no extra code.\n\nGET /content/search takes query, locale, kinds, packs, limit and offset\nand answers the ids of one page of matches, best first, with the total.\nIt is public for official packs; named homebrew packs are searched only\nwhen the signed-in caller may read them, and that answer is private.\n\nThe content browser gets a search box (q in the link) that lists what\nthe server found and applies the filters to it client-side.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(content): backfill descriptions missed by the entry texts migration\n\n0022 read \"data\" -> 'description', which is NULL when the driver stored\n`data` as a JSON string, so it wrote no rows, and the seed skips a pack\nwhose hash is unchanged. 0024 inserts the missing en description rows\nthrough content_entry_description (0023), which reads both forms, and\nrewrites texts stored as a JSON string as the document they hold.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* chore(content): renumber the search and backfill migrations after main\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test(content): type the backfill test's entry ids\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(content): keep a renewed session cookie off a public search\n\nA search naming no packs is cached public; drop set-cookie there. The\nbackfill also skips a description that is not an array.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:57:57+10:00",
          "tree_id": "db5b758adb6909f29cd91b5e0a2b05b7b429ddeb",
          "url": "https://github.com/DavidDudson/pioneer/commit/970ffb57acfbd19d926201a5b16f67b07cd5cd97"
        },
        "date": 1792101580788,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 11.894,
            "unit": "ms",
            "extra": "median 14.456 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 16.394,
            "unit": "ms",
            "extra": "median 18.593 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 12.279,
            "unit": "ms",
            "extra": "median 13.358 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 11.054,
            "unit": "ms",
            "extra": "median 12.492 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 14.606,
            "unit": "ms",
            "extra": "median 16.026 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 13.455,
            "unit": "ms",
            "extra": "median 14.928 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 13.681,
            "unit": "ms",
            "extra": "median 15.2 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 12.678,
            "unit": "ms",
            "extra": "median 13.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 12.204,
            "unit": "ms",
            "extra": "median 13.177 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 15.102,
            "unit": "ms",
            "extra": "median 16.668 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 15.59,
            "unit": "ms",
            "extra": "median 16.961 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 14.455,
            "unit": "ms",
            "extra": "median 15.948 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 11.475,
            "unit": "ms",
            "extra": "median 12.822 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 13.685,
            "unit": "ms",
            "extra": "median 15.125 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 12.964,
            "unit": "ms",
            "extra": "median 14.115 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 16.563,
            "unit": "ms",
            "extra": "median 17.97 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 11.337,
            "unit": "ms",
            "extra": "median 12.248 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 16.462,
            "unit": "ms",
            "extra": "median 17.286 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.123,
            "unit": "ms",
            "extra": "median 4.295 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.22,
            "unit": "ms",
            "extra": "median 3.817 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.501,
            "unit": "ms",
            "extra": "median 0.616 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.529,
            "unit": "ms",
            "extra": "median 0.647 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.26,
            "unit": "ms",
            "extra": "median 0.567 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "436ad744830d79904622aa5566f557700f848da5",
          "message": "feat(interop): fill feat slots from a Pathbuilder export (#932)\n\n* fix(interop): cap Pathbuilder property runes at what an item holds\n\nMordred's Caliburn lists seven property runes; the inventory schema holds\nfive, so the import threw. Etch the first five.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(interop): fill feat slots from a Pathbuilder export\n\nEach slotted feat goes in an open feat slot of its level that offers it, the\nslot named for its type (skill, general) first, round after round as feats open\nmore slots. A feat's own choice answers the ChoiceSet it opens. A matched feat\nno slot takes is reported as not offered; feats are no longer listed as not\ncarried.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T07:59:05+10:00",
          "tree_id": "d44b98c37008be7af16f6f9bc652d813d2630370",
          "url": "https://github.com/DavidDudson/pioneer/commit/436ad744830d79904622aa5566f557700f848da5"
        },
        "date": 1792101708244,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.835,
            "unit": "ms",
            "extra": "median 23.024 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.49,
            "unit": "ms",
            "extra": "median 32.268 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 21.857,
            "unit": "ms",
            "extra": "median 24.193 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.755,
            "unit": "ms",
            "extra": "median 21.138 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 23.797,
            "unit": "ms",
            "extra": "median 25.764 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 23.409,
            "unit": "ms",
            "extra": "median 25.002 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.554,
            "unit": "ms",
            "extra": "median 25.871 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.519,
            "unit": "ms",
            "extra": "median 23.276 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 21.236,
            "unit": "ms",
            "extra": "median 23.472 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 26.319,
            "unit": "ms",
            "extra": "median 28.16 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 25.561,
            "unit": "ms",
            "extra": "median 27.938 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.665,
            "unit": "ms",
            "extra": "median 25.562 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.14,
            "unit": "ms",
            "extra": "median 21.554 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.471,
            "unit": "ms",
            "extra": "median 24.838 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.014,
            "unit": "ms",
            "extra": "median 22.588 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.303,
            "unit": "ms",
            "extra": "median 30.034 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.05,
            "unit": "ms",
            "extra": "median 20.636 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 28.854,
            "unit": "ms",
            "extra": "median 30.51 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.298,
            "unit": "ms",
            "extra": "median 6.99 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.342,
            "unit": "ms",
            "extra": "median 6.474 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.066,
            "unit": "ms",
            "extra": "median 1.356 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.02,
            "unit": "ms",
            "extra": "median 1.266 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.561,
            "unit": "ms",
            "extra": "median 1.094 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "2c10b9ef3be4aa77380e2e145c1b90788658367f",
          "message": "feat(interop): fill skill slots from a Pathbuilder export (#933)",
          "timestamp": "2026-10-16T08:15:51+10:00",
          "tree_id": "faa5d302a7bbd05beb52ba74953a22eb238e4078",
          "url": "https://github.com/DavidDudson/pioneer/commit/2c10b9ef3be4aa77380e2e145c1b90788658367f"
        },
        "date": 1792102667579,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.267,
            "unit": "ms",
            "extra": "median 21.741 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 28.309,
            "unit": "ms",
            "extra": "median 30.229 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 21.874,
            "unit": "ms",
            "extra": "median 23.147 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.219,
            "unit": "ms",
            "extra": "median 20.263 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 23.221,
            "unit": "ms",
            "extra": "median 24.737 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 22.675,
            "unit": "ms",
            "extra": "median 24.161 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.173,
            "unit": "ms",
            "extra": "median 24.385 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.029,
            "unit": "ms",
            "extra": "median 22.122 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 20.878,
            "unit": "ms",
            "extra": "median 21.783 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 25.659,
            "unit": "ms",
            "extra": "median 26.923 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 25.476,
            "unit": "ms",
            "extra": "median 26.548 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 22.972,
            "unit": "ms",
            "extra": "median 24.124 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 19.57,
            "unit": "ms",
            "extra": "median 20.718 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 22.947,
            "unit": "ms",
            "extra": "median 24.267 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 20.535,
            "unit": "ms",
            "extra": "median 21.616 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 27.445,
            "unit": "ms",
            "extra": "median 28.618 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 18.806,
            "unit": "ms",
            "extra": "median 19.863 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 28.408,
            "unit": "ms",
            "extra": "median 29.415 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.175,
            "unit": "ms",
            "extra": "median 6.091 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.108,
            "unit": "ms",
            "extra": "median 5.935 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.766,
            "unit": "ms",
            "extra": "median 0.977 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.929,
            "unit": "ms",
            "extra": "median 1.108 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.485,
            "unit": "ms",
            "extra": "median 0.991 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "9265e670e0965a3a9fbe7d152c4d2aec0bfd28b7",
          "message": "feat(content): global search box in the app shell (#934)",
          "timestamp": "2026-10-16T08:40:12+10:00",
          "tree_id": "5bd0998e4d13ff4a2c2d560d265b5a2a6c951cd2",
          "url": "https://github.com/DavidDudson/pioneer/commit/9265e670e0965a3a9fbe7d152c4d2aec0bfd28b7"
        },
        "date": 1792104111597,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 12.28,
            "unit": "ms",
            "extra": "median 14.656 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 16.598,
            "unit": "ms",
            "extra": "median 18.346 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 12.94,
            "unit": "ms",
            "extra": "median 14.355 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 11.878,
            "unit": "ms",
            "extra": "median 12.913 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 14.201,
            "unit": "ms",
            "extra": "median 15.316 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 14.271,
            "unit": "ms",
            "extra": "median 16.998 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 14.43,
            "unit": "ms",
            "extra": "median 15.663 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 12.888,
            "unit": "ms",
            "extra": "median 14.019 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 13.099,
            "unit": "ms",
            "extra": "median 14.25 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 16.102,
            "unit": "ms",
            "extra": "median 18.235 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 17.053,
            "unit": "ms",
            "extra": "median 20.018 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 15.177,
            "unit": "ms",
            "extra": "median 20.334 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 12.415,
            "unit": "ms",
            "extra": "median 16.343 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 14.12,
            "unit": "ms",
            "extra": "median 15.737 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 13.158,
            "unit": "ms",
            "extra": "median 14.684 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 17.642,
            "unit": "ms",
            "extra": "median 19.966 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 11.769,
            "unit": "ms",
            "extra": "median 13.042 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 18.136,
            "unit": "ms",
            "extra": "median 20.901 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.591,
            "unit": "ms",
            "extra": "median 5.265 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.713,
            "unit": "ms",
            "extra": "median 4.404 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.536,
            "unit": "ms",
            "extra": "median 0.695 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.604,
            "unit": "ms",
            "extra": "median 0.732 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.278,
            "unit": "ms",
            "extra": "median 0.584 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "5b245b62c97dc5e61e0c50eefa559b4dfca9314b",
          "message": "feat(spellcasting): Order Explorer and Order Magic (#936)\n\nA druid with Order Explorer joins a druidic order it does not have, for\nfeat prerequisites only: the pick sets feat:order-explorer:<order>,\nwhich every order's benefits already read, and grants the order's\nfeature. Order Magic offers the orders Order Explorer joined and gives\nthe picked order's order spell through FocusSpells.\n\nA ChoiceSet pick that is an entry now sets its slug in the roll option\nit writes (feat:order-explorer:leaf-order), as Foundry names an item\npick, instead of its content id, so the guards Foundry's data already\ncarries match.\n\nRefs #604\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T21:46:18+10:00",
          "tree_id": "3c386dc2de158340eeed9d4726e4075335b5be07",
          "url": "https://github.com/DavidDudson/pioneer/commit/5b245b62c97dc5e61e0c50eefa559b4dfca9314b"
        },
        "date": 1792151405596,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 25.896,
            "unit": "ms",
            "extra": "median 28.957 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 32.932,
            "unit": "ms",
            "extra": "median 37.143 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 25.122,
            "unit": "ms",
            "extra": "median 27.419 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 21.513,
            "unit": "ms",
            "extra": "median 23.759 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 26.697,
            "unit": "ms",
            "extra": "median 28.792 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 25.961,
            "unit": "ms",
            "extra": "median 27.852 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 26.705,
            "unit": "ms",
            "extra": "median 29.701 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 23.842,
            "unit": "ms",
            "extra": "median 26.511 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.531,
            "unit": "ms",
            "extra": "median 25.846 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 29.335,
            "unit": "ms",
            "extra": "median 31.689 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 28.791,
            "unit": "ms",
            "extra": "median 31.513 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 27.115,
            "unit": "ms",
            "extra": "median 30.378 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 22.563,
            "unit": "ms",
            "extra": "median 24.787 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 26.605,
            "unit": "ms",
            "extra": "median 29.565 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 23.315,
            "unit": "ms",
            "extra": "median 25.354 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 32.099,
            "unit": "ms",
            "extra": "median 34.405 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 21.438,
            "unit": "ms",
            "extra": "median 23.778 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 33.486,
            "unit": "ms",
            "extra": "median 35.63 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.739,
            "unit": "ms",
            "extra": "median 7.777 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.663,
            "unit": "ms",
            "extra": "median 6.515 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.971,
            "unit": "ms",
            "extra": "median 1.103 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.022,
            "unit": "ms",
            "extra": "median 1.262 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.563,
            "unit": "ms",
            "extra": "median 1.093 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "36f7595a2a0b3ae719fcba682eb3e7a4ca520449",
          "message": "feat(campaign): warn on Plan about unenabled content (#938)\n\nA character in a campaign uses the campaign's packs and variant rules and ignores its own. Add GET /characters/:id/unenabled-content, the set difference per kind, and a Plan tab warning naming each variant rule, pack and item the campaign has not enabled. Warn only: nothing is blocked or hidden. Record what a character uses in character-model.md.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T21:47:26+10:00",
          "tree_id": "a6b416f9e964c187edd4cfc47f84a7d30eca641d",
          "url": "https://github.com/DavidDudson/pioneer/commit/36f7595a2a0b3ae719fcba682eb3e7a4ca520449"
        },
        "date": 1792151542494,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 20.267,
            "unit": "ms",
            "extra": "median 23.341 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.367,
            "unit": "ms",
            "extra": "median 32.56 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 21.989,
            "unit": "ms",
            "extra": "median 24.369 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.565,
            "unit": "ms",
            "extra": "median 21.092 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 24.055,
            "unit": "ms",
            "extra": "median 26.143 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 23.412,
            "unit": "ms",
            "extra": "median 25.343 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 24.834,
            "unit": "ms",
            "extra": "median 26.622 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.282,
            "unit": "ms",
            "extra": "median 24.8 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 22.421,
            "unit": "ms",
            "extra": "median 24.845 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 26.573,
            "unit": "ms",
            "extra": "median 28.659 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 25.834,
            "unit": "ms",
            "extra": "median 27.795 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 24.022,
            "unit": "ms",
            "extra": "median 25.471 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.278,
            "unit": "ms",
            "extra": "median 21.695 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.831,
            "unit": "ms",
            "extra": "median 25.621 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.132,
            "unit": "ms",
            "extra": "median 22.915 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 29.395,
            "unit": "ms",
            "extra": "median 31.128 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.839,
            "unit": "ms",
            "extra": "median 22.148 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 31.273,
            "unit": "ms",
            "extra": "median 33.064 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.686,
            "unit": "ms",
            "extra": "median 6.692 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.576,
            "unit": "ms",
            "extra": "median 6.337 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.963,
            "unit": "ms",
            "extra": "median 1.167 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.022,
            "unit": "ms",
            "extra": "median 1.448 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.566,
            "unit": "ms",
            "extra": "median 0.998 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "228ba5ccd63d0932e58d4efdf982fc515f4d7ede",
          "message": "feat(content): import Guns & Gears from Foundry (#939)\n\nImports the remaster ORC content of Pathfinder Guns & Gears (748 entries) at\npf2e-8.6.0 into a guns-and-gears pack, with its backlog and the vocabulary it\nadds to core-rules. Registers the book, maps Foundry's publication title, and\nlists it in NOTICE.md and the Legal page.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T21:52:29+10:00",
          "tree_id": "c54a482cabe95a7c9c5f3fa53aa6077fd48731f0",
          "url": "https://github.com/DavidDudson/pioneer/commit/228ba5ccd63d0932e58d4efdf982fc515f4d7ede"
        },
        "date": 1792151660685,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 16.897,
            "unit": "ms",
            "extra": "median 19.006 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 23.27,
            "unit": "ms",
            "extra": "median 26.34 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 17.974,
            "unit": "ms",
            "extra": "median 20.515 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 16.225,
            "unit": "ms",
            "extra": "median 18.02 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 20.104,
            "unit": "ms",
            "extra": "median 21.633 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 19.814,
            "unit": "ms",
            "extra": "median 21.631 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 20.033,
            "unit": "ms",
            "extra": "median 21.485 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 17.822,
            "unit": "ms",
            "extra": "median 19.95 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 17.571,
            "unit": "ms",
            "extra": "median 19.196 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 21.27,
            "unit": "ms",
            "extra": "median 22.888 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 20.694,
            "unit": "ms",
            "extra": "median 22.136 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 19.505,
            "unit": "ms",
            "extra": "median 20.938 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 16.436,
            "unit": "ms",
            "extra": "median 17.785 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 19.335,
            "unit": "ms",
            "extra": "median 20.779 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 17.411,
            "unit": "ms",
            "extra": "median 19.075 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 23.822,
            "unit": "ms",
            "extra": "median 25.548 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 16.521,
            "unit": "ms",
            "extra": "median 18.46 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 23.512,
            "unit": "ms",
            "extra": "median 24.552 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 3.94,
            "unit": "ms",
            "extra": "median 5.075 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 3.949,
            "unit": "ms",
            "extra": "median 4.597 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.582,
            "unit": "ms",
            "extra": "median 0.706 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.561,
            "unit": "ms",
            "extra": "median 0.815 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.297,
            "unit": "ms",
            "extra": "median 0.699 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "6a70c8f5f8e5f303f7b15e98aff0c2bbd1ae4ca6",
          "message": "fix: green main again (bench, typecheck, lint, catalog test) (#913)\n\n* fix(importer): read a granter's level in choice filters as the character's\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(content): spell the Tian Xia poison trait predicate right\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test: brand the values tests compare so typecheck passes\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test(catalog): check the OGL packs are registered too\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* chore: clear the workspace lint failures on main\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(content): query the Summoner's Eidolon among class features\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test(api): check the level 20 builds in a unit test, not the bench\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(content-import): report catalog registration and spelling after a write\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix: keep main's new content and matching green\n\nThe Impossible Magic merge left a Uuid where a ContentId is wanted, and the\nPathbuilder matcher now counts Vigilant Goloma as a feat.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix: format play-service imports, expect spell not lore uncarried\n\nSkill slots now carry lore, so the Pathbuilder route test expects a\nfield still uncarried.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs: resolve content-model merge, keep guns-and-gears\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:00:41+10:00",
          "tree_id": "49bde57c7abb6c6ba45209b49fea641ddb4da38f",
          "url": "https://github.com/DavidDudson/pioneer/commit/6a70c8f5f8e5f303f7b15e98aff0c2bbd1ae4ca6"
        },
        "date": 1792152178778,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 19.726,
            "unit": "ms",
            "extra": "median 22.759 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 26.89,
            "unit": "ms",
            "extra": "median 30.313 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 20.393,
            "unit": "ms",
            "extra": "median 22.972 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 18.563,
            "unit": "ms",
            "extra": "median 20.414 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 22.802,
            "unit": "ms",
            "extra": "median 24.86 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 21.536,
            "unit": "ms",
            "extra": "median 24.054 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 22.182,
            "unit": "ms",
            "extra": "median 24.032 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 20.256,
            "unit": "ms",
            "extra": "median 22.093 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 20.003,
            "unit": "ms",
            "extra": "median 21.928 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 24.147,
            "unit": "ms",
            "extra": "median 27.021 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 23.277,
            "unit": "ms",
            "extra": "median 25.684 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 22.462,
            "unit": "ms",
            "extra": "median 24.551 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 18.703,
            "unit": "ms",
            "extra": "median 20.98 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 22.142,
            "unit": "ms",
            "extra": "median 24.589 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 19.824,
            "unit": "ms",
            "extra": "median 21.86 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 26.041,
            "unit": "ms",
            "extra": "median 28.575 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 18.447,
            "unit": "ms",
            "extra": "median 19.838 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 26.61,
            "unit": "ms",
            "extra": "median 29.425 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 28.048,
            "unit": "ms",
            "extra": "median 30.112 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 24.336,
            "unit": "ms",
            "extra": "median 27.17 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 19.773,
            "unit": "ms",
            "extra": "median 21.648 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 19.547,
            "unit": "ms",
            "extra": "median 21.815 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 19.722,
            "unit": "ms",
            "extra": "median 21.483 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 19.862,
            "unit": "ms",
            "extra": "median 21.809 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 20.33,
            "unit": "ms",
            "extra": "median 22.337 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 21.248,
            "unit": "ms",
            "extra": "median 22.978 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.552,
            "unit": "ms",
            "extra": "median 6.739 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.567,
            "unit": "ms",
            "extra": "median 6.484 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.022,
            "unit": "ms",
            "extra": "median 1.19 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.876,
            "unit": "ms",
            "extra": "median 1.215 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.416,
            "unit": "ms",
            "extra": "median 0.907 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "cca5b4e38ef92240b54b428f0bde9d0ed08b9daf",
          "message": "feat(sheet): table limits as engine input (#920) (#942)\n\nInvested, hands, property runes per grade and lines become a\nRuleLimits input, core rules by default, instead of schema\nconstants. inventoryViolations derives the broken rules on read.\nADR-0064 records where limits live and how they combine.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:13:22+10:00",
          "tree_id": "7897b3021b3cb9e16179876a9be618335f021810",
          "url": "https://github.com/DavidDudson/pioneer/commit/cca5b4e38ef92240b54b428f0bde9d0ed08b9daf"
        },
        "date": 1792152970436,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 27.756,
            "unit": "ms",
            "extra": "median 31.049 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 37.612,
            "unit": "ms",
            "extra": "median 39.743 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 29.553,
            "unit": "ms",
            "extra": "median 31.317 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 25.688,
            "unit": "ms",
            "extra": "median 28.616 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.939,
            "unit": "ms",
            "extra": "median 34.109 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 29.479,
            "unit": "ms",
            "extra": "median 31.654 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.311,
            "unit": "ms",
            "extra": "median 32.38 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 27.395,
            "unit": "ms",
            "extra": "median 29.717 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 26.228,
            "unit": "ms",
            "extra": "median 28.779 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 30.98,
            "unit": "ms",
            "extra": "median 33.581 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 32.512,
            "unit": "ms",
            "extra": "median 34.296 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 30.529,
            "unit": "ms",
            "extra": "median 32.444 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 26.752,
            "unit": "ms",
            "extra": "median 28.449 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 31.257,
            "unit": "ms",
            "extra": "median 32.737 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 28.459,
            "unit": "ms",
            "extra": "median 30.137 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 35.957,
            "unit": "ms",
            "extra": "median 37.684 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 26.058,
            "unit": "ms",
            "extra": "median 27.645 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 36.415,
            "unit": "ms",
            "extra": "median 38.33 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 36.895,
            "unit": "ms",
            "extra": "median 39.225 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 34.063,
            "unit": "ms",
            "extra": "median 36.189 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.713,
            "unit": "ms",
            "extra": "median 29.821 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 27.725,
            "unit": "ms",
            "extra": "median 30.009 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 28.047,
            "unit": "ms",
            "extra": "median 29.533 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 28.352,
            "unit": "ms",
            "extra": "median 29.832 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 28.946,
            "unit": "ms",
            "extra": "median 30.733 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 29.896,
            "unit": "ms",
            "extra": "median 31.296 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.409,
            "unit": "ms",
            "extra": "median 7.776 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.348,
            "unit": "ms",
            "extra": "median 7.319 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.054,
            "unit": "ms",
            "extra": "median 1.306 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.101,
            "unit": "ms",
            "extra": "median 1.553 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.594,
            "unit": "ms",
            "extra": "median 1.202 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "120f84099e97c609559d981bfb7ef816c9a73f4b",
          "message": "feat(interop): fill language slots from a Pathbuilder export (#941)\n\nplaceLanguages gives each open language slot up to the character's level\nthe first language it offers that the export lists. Languages the ancestry\nand features grant need no slot. A matched language the character still\ndoesn't know afterwards is reported as not offered.\n\nThe lookup now indexes Language entries, and language is no longer an\nuncarried field.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:13:58+10:00",
          "tree_id": "b964943c72ca2b40bbed2c264f6b5f8f86abf44e",
          "url": "https://github.com/DavidDudson/pioneer/commit/120f84099e97c609559d981bfb7ef816c9a73f4b"
        },
        "date": 1792153105234,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 17.757,
            "unit": "ms",
            "extra": "median 19.794 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 26.262,
            "unit": "ms",
            "extra": "median 31.194 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 18.913,
            "unit": "ms",
            "extra": "median 21.539 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 15.918,
            "unit": "ms",
            "extra": "median 19.195 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 20.552,
            "unit": "ms",
            "extra": "median 23.71 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 20.853,
            "unit": "ms",
            "extra": "median 26.547 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 20.499,
            "unit": "ms",
            "extra": "median 25.982 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.135,
            "unit": "ms",
            "extra": "median 24.897 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 18.605,
            "unit": "ms",
            "extra": "median 22.433 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 22.777,
            "unit": "ms",
            "extra": "median 27.46 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 22.205,
            "unit": "ms",
            "extra": "median 27.086 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 20.588,
            "unit": "ms",
            "extra": "median 24.267 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 17.091,
            "unit": "ms",
            "extra": "median 20.222 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 18.872,
            "unit": "ms",
            "extra": "median 20.967 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 17.232,
            "unit": "ms",
            "extra": "median 18.231 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 22.715,
            "unit": "ms",
            "extra": "median 24.127 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 15.769,
            "unit": "ms",
            "extra": "median 16.824 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 23.368,
            "unit": "ms",
            "extra": "median 26.674 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 23.765,
            "unit": "ms",
            "extra": "median 25.467 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 21.769,
            "unit": "ms",
            "extra": "median 23.162 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 17.499,
            "unit": "ms",
            "extra": "median 18.534 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 17.557,
            "unit": "ms",
            "extra": "median 18.353 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 17.325,
            "unit": "ms",
            "extra": "median 18.007 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 17.802,
            "unit": "ms",
            "extra": "median 18.539 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 18.039,
            "unit": "ms",
            "extra": "median 18.891 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 18.584,
            "unit": "ms",
            "extra": "median 19.407 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.604,
            "unit": "ms",
            "extra": "median 5.44 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.633,
            "unit": "ms",
            "extra": "median 5.514 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.66,
            "unit": "ms",
            "extra": "median 0.817 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.745,
            "unit": "ms",
            "extra": "median 0.919 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.415,
            "unit": "ms",
            "extra": "median 0.866 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "be06cbc0653c6319808229cde92a7b5e6edf7102",
          "message": "feat(content): import Battlecry! from Foundry (#943)\n\nImports the remaster ORC content of Pathfinder Battlecry! (777 entries, 599 with\nrules translated) at pf2e-8.6.0 into a battlecry pack, with its backlog and the\nvocabulary it adds to core-rules. Registers the book, maps Foundry's publication\ntitle, and lists it in NOTICE.md and the Legal page.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:19:33+10:00",
          "tree_id": "c9a40bd9512fa62c903b48a13bf6e9362dfce947",
          "url": "https://github.com/DavidDudson/pioneer/commit/be06cbc0653c6319808229cde92a7b5e6edf7102"
        },
        "date": 1792153311891,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 21.673,
            "unit": "ms",
            "extra": "median 23.131 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.871,
            "unit": "ms",
            "extra": "median 31.746 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 23.154,
            "unit": "ms",
            "extra": "median 24.275 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 20.888,
            "unit": "ms",
            "extra": "median 21.554 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 25.353,
            "unit": "ms",
            "extra": "median 26.384 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 24.481,
            "unit": "ms",
            "extra": "median 25.313 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 24.827,
            "unit": "ms",
            "extra": "median 25.828 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.556,
            "unit": "ms",
            "extra": "median 23.398 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 22.375,
            "unit": "ms",
            "extra": "median 23.056 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 27.307,
            "unit": "ms",
            "extra": "median 27.918 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 26.481,
            "unit": "ms",
            "extra": "median 27.376 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 24.607,
            "unit": "ms",
            "extra": "median 25.544 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.86,
            "unit": "ms",
            "extra": "median 21.489 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 24.361,
            "unit": "ms",
            "extra": "median 25.361 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.984,
            "unit": "ms",
            "extra": "median 22.665 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.676,
            "unit": "ms",
            "extra": "median 29.873 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.981,
            "unit": "ms",
            "extra": "median 20.717 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.318,
            "unit": "ms",
            "extra": "median 30.7 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 29.822,
            "unit": "ms",
            "extra": "median 31.674 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 27.399,
            "unit": "ms",
            "extra": "median 28.546 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 22.085,
            "unit": "ms",
            "extra": "median 22.764 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 22.288,
            "unit": "ms",
            "extra": "median 23.144 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 21.504,
            "unit": "ms",
            "extra": "median 22.376 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 22.463,
            "unit": "ms",
            "extra": "median 23.235 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 22.486,
            "unit": "ms",
            "extra": "median 23.372 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 23.191,
            "unit": "ms",
            "extra": "median 24.134 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 22.742,
            "unit": "ms",
            "extra": "median 23.68 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 22.348,
            "unit": "ms",
            "extra": "median 22.987 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.888,
            "unit": "ms",
            "extra": "median 7.58 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.839,
            "unit": "ms",
            "extra": "median 6.861 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.874,
            "unit": "ms",
            "extra": "median 1.067 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.972,
            "unit": "ms",
            "extra": "median 1.194 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.542,
            "unit": "ms",
            "extra": "median 1.093 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "967fff26e8c01bf7d1c8d8d018253cc232a2e410",
          "message": "feat(play): cast a staff with charges or slot (#940)\n\nA held staff casts one of its spells for charges equal to the spell's\nrank, a cantrip for none. A spontaneous caster can instead pay 1 charge\nand a slot of the spell's rank or higher. The server derives the cost\nfrom the staff's content and refuses a cast it can't pay for, so a cast\nis never partly applied. Taking a cast back refunds exactly what it\nspent.\n\nThe sheet labels each way to cast with what it spends, and offers one\nundo for the last cast until the spend log exists.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:20:03+10:00",
          "tree_id": "c9e4cccf2b265dc49a6822f2e8b7104e80844e7f",
          "url": "https://github.com/DavidDudson/pioneer/commit/967fff26e8c01bf7d1c8d8d018253cc232a2e410"
        },
        "date": 1792153463123,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 25.071,
            "unit": "ms",
            "extra": "median 28.526 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 34.592,
            "unit": "ms",
            "extra": "median 39.936 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 26.271,
            "unit": "ms",
            "extra": "median 30.063 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 23.404,
            "unit": "ms",
            "extra": "median 28.209 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 29.147,
            "unit": "ms",
            "extra": "median 35.101 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 27.051,
            "unit": "ms",
            "extra": "median 31.046 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.194,
            "unit": "ms",
            "extra": "median 33.992 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 24.488,
            "unit": "ms",
            "extra": "median 29.202 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 25.618,
            "unit": "ms",
            "extra": "median 30.999 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 29.314,
            "unit": "ms",
            "extra": "median 34.882 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.93,
            "unit": "ms",
            "extra": "median 31.15 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.001,
            "unit": "ms",
            "extra": "median 29.875 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 22.427,
            "unit": "ms",
            "extra": "median 25.322 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 27.301,
            "unit": "ms",
            "extra": "median 31.596 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 23.625,
            "unit": "ms",
            "extra": "median 26.992 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 31.796,
            "unit": "ms",
            "extra": "median 34.866 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 21.119,
            "unit": "ms",
            "extra": "median 23.412 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 31.325,
            "unit": "ms",
            "extra": "median 35.947 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 31.684,
            "unit": "ms",
            "extra": "median 36.726 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 31.027,
            "unit": "ms",
            "extra": "median 35.178 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.974,
            "unit": "ms",
            "extra": "median 31.406 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 29.758,
            "unit": "ms",
            "extra": "median 32.03 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 27.747,
            "unit": "ms",
            "extra": "median 30.8 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 24.358,
            "unit": "ms",
            "extra": "median 27.844 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 24.574,
            "unit": "ms",
            "extra": "median 27.399 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 25.508,
            "unit": "ms",
            "extra": "median 29.259 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 25.013,
            "unit": "ms",
            "extra": "median 29.257 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 24.483,
            "unit": "ms",
            "extra": "median 27.83 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.217,
            "unit": "ms",
            "extra": "median 8.148 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.524,
            "unit": "ms",
            "extra": "median 7.424 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.119,
            "unit": "ms",
            "extra": "median 1.293 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.069,
            "unit": "ms",
            "extra": "median 1.478 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.547,
            "unit": "ms",
            "extra": "median 1.122 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "dbb818574a680ad6b76f576ecba799024c8ec80d",
          "message": "feat(spellcasting): focus spells from archetype feats (#950)\n\nCounter Perform teaches Counter Performance. Druid Dedication picks an\norder (feat:druid-dedication:<order>) and Order Spell gives that order's\nspell; an order joined this way grants no order spell of its own. Wizard\nDedication picks a school and Arcane School Spell gives its initial\nspell. Each feat adds the focus entry of its class's tradition and\nattribute, so the pool counts them with the class's own, capped at 3.\n\nRefs #606\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:22:07+10:00",
          "tree_id": "5481458e6eee9ff2c138193d71a6b9f911721a97",
          "url": "https://github.com/DavidDudson/pioneer/commit/dbb818574a680ad6b76f576ecba799024c8ec80d"
        },
        "date": 1792153604538,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 21.236,
            "unit": "ms",
            "extra": "median 23.292 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.613,
            "unit": "ms",
            "extra": "median 31.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 22.935,
            "unit": "ms",
            "extra": "median 24.906 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 21.239,
            "unit": "ms",
            "extra": "median 22.483 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 25.395,
            "unit": "ms",
            "extra": "median 26.738 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 23.991,
            "unit": "ms",
            "extra": "median 25.454 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 24.554,
            "unit": "ms",
            "extra": "median 26.068 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.064,
            "unit": "ms",
            "extra": "median 23.774 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 21.932,
            "unit": "ms",
            "extra": "median 23.282 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 26.8,
            "unit": "ms",
            "extra": "median 28.031 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 24.779,
            "unit": "ms",
            "extra": "median 26.692 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.693,
            "unit": "ms",
            "extra": "median 25.245 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.213,
            "unit": "ms",
            "extra": "median 22.04 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.977,
            "unit": "ms",
            "extra": "median 25.533 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.204,
            "unit": "ms",
            "extra": "median 24.083 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.607,
            "unit": "ms",
            "extra": "median 30.503 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 20.591,
            "unit": "ms",
            "extra": "median 21.701 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.32,
            "unit": "ms",
            "extra": "median 30.706 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 29.962,
            "unit": "ms",
            "extra": "median 32.169 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 27.534,
            "unit": "ms",
            "extra": "median 28.987 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 22.34,
            "unit": "ms",
            "extra": "median 23.751 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 22.249,
            "unit": "ms",
            "extra": "median 23.699 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 22.126,
            "unit": "ms",
            "extra": "median 23.289 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 22.843,
            "unit": "ms",
            "extra": "median 23.995 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 22.313,
            "unit": "ms",
            "extra": "median 24.116 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 23.436,
            "unit": "ms",
            "extra": "median 24.297 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 22.551,
            "unit": "ms",
            "extra": "median 23.649 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 21.828,
            "unit": "ms",
            "extra": "median 23.049 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.43,
            "unit": "ms",
            "extra": "median 7.509 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.749,
            "unit": "ms",
            "extra": "median 7.659 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.999,
            "unit": "ms",
            "extra": "median 1.214 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.883,
            "unit": "ms",
            "extra": "median 1.087 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.314,
            "unit": "ms",
            "extra": "median 0.852 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "06efa8558b9fada37cb4a63fafd24a97864588f7",
          "message": "feat(interop): Pathbuilder discrepancy report (#963)\n\nAfter a Pathbuilder import, compare the numbers Pathbuilder computed with\nwhat the engine derives for the new character: AC, maximum Hit Points and\nSpeed as totals, and the rank of each save, Perception, the class DC and\nthe skills. The import report gains `discrepancies` (what was compared and\nwhat differs), and the plan tab's import result lists each difference with\nboth values, the difference, and a \"Why\" disclosure holding the statistic's\nbreakdown.\n\nA statistic the engine can't derive (no content for it) is left out rather\nthan reported as different. Spell DCs are not compared yet.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:34:24+10:00",
          "tree_id": "56628cbf1c95c8865a47664e0a2b8412be45f11d",
          "url": "https://github.com/DavidDudson/pioneer/commit/06efa8558b9fada37cb4a63fafd24a97864588f7"
        },
        "date": 1792154206940,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 23.939,
            "unit": "ms",
            "extra": "median 25.603 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 32.095,
            "unit": "ms",
            "extra": "median 34.621 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 24.922,
            "unit": "ms",
            "extra": "median 27.183 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 22.347,
            "unit": "ms",
            "extra": "median 25.298 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 26.497,
            "unit": "ms",
            "extra": "median 29.142 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 26.477,
            "unit": "ms",
            "extra": "median 28.317 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 26.683,
            "unit": "ms",
            "extra": "median 29.838 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 24.618,
            "unit": "ms",
            "extra": "median 26.816 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.614,
            "unit": "ms",
            "extra": "median 25.186 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 28.525,
            "unit": "ms",
            "extra": "median 32.26 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.614,
            "unit": "ms",
            "extra": "median 30.178 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.435,
            "unit": "ms",
            "extra": "median 28.955 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 22.226,
            "unit": "ms",
            "extra": "median 23.966 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 25.56,
            "unit": "ms",
            "extra": "median 27.462 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 23.428,
            "unit": "ms",
            "extra": "median 25.562 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 29.924,
            "unit": "ms",
            "extra": "median 32.229 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 21.18,
            "unit": "ms",
            "extra": "median 22.323 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 30.989,
            "unit": "ms",
            "extra": "median 32.74 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 31.669,
            "unit": "ms",
            "extra": "median 33.859 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 28.607,
            "unit": "ms",
            "extra": "median 31.943 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 23.396,
            "unit": "ms",
            "extra": "median 25.011 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 23.416,
            "unit": "ms",
            "extra": "median 25.537 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 22.658,
            "unit": "ms",
            "extra": "median 25.256 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 22.704,
            "unit": "ms",
            "extra": "median 24.708 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 23.882,
            "unit": "ms",
            "extra": "median 25.571 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 24.43,
            "unit": "ms",
            "extra": "median 26.198 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 23.438,
            "unit": "ms",
            "extra": "median 25.65 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 23.308,
            "unit": "ms",
            "extra": "median 26.332 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.256,
            "unit": "ms",
            "extra": "median 8.012 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.187,
            "unit": "ms",
            "extra": "median 6.987 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.918,
            "unit": "ms",
            "extra": "median 1.082 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.945,
            "unit": "ms",
            "extra": "median 1.188 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.487,
            "unit": "ms",
            "extra": "median 0.961 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "e5c02b88ce112269a22402cf12c4c8b416aff606",
          "message": "feat(interop): spell DCs in the Pathbuilder discrepancy report (#969)\n\nCompare each focus tradition and attribute's DC (10 + ability + item + rank,\nplus level when trained) with the engine's spell-dc for the first entry with\nthat tradition and attribute. A focus tradition with no such entry is left out.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:41:09+10:00",
          "tree_id": "4179d7357aab7880a7c72fe00f3ed5e4ba17bfe3",
          "url": "https://github.com/DavidDudson/pioneer/commit/e5c02b88ce112269a22402cf12c4c8b416aff606"
        },
        "date": 1792154630514,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 27.457,
            "unit": "ms",
            "extra": "median 30.2 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 35.379,
            "unit": "ms",
            "extra": "median 38.864 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 28.932,
            "unit": "ms",
            "extra": "median 34.11 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 23.176,
            "unit": "ms",
            "extra": "median 27.903 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 29.636,
            "unit": "ms",
            "extra": "median 33.077 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 27.401,
            "unit": "ms",
            "extra": "median 31.495 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.469,
            "unit": "ms",
            "extra": "median 34.341 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 27.099,
            "unit": "ms",
            "extra": "median 30.054 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 24.698,
            "unit": "ms",
            "extra": "median 29.659 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 30.668,
            "unit": "ms",
            "extra": "median 34.813 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 29.02,
            "unit": "ms",
            "extra": "median 34.983 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 28.337,
            "unit": "ms",
            "extra": "median 34.546 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 27.059,
            "unit": "ms",
            "extra": "median 29.812 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 29.682,
            "unit": "ms",
            "extra": "median 32.552 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.853,
            "unit": "ms",
            "extra": "median 30.645 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 34.979,
            "unit": "ms",
            "extra": "median 39.373 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 26.296,
            "unit": "ms",
            "extra": "median 28.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 36.293,
            "unit": "ms",
            "extra": "median 38.692 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 34.914,
            "unit": "ms",
            "extra": "median 40.358 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 33.75,
            "unit": "ms",
            "extra": "median 36.09 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.666,
            "unit": "ms",
            "extra": "median 31.129 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 27.285,
            "unit": "ms",
            "extra": "median 30.306 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 25.903,
            "unit": "ms",
            "extra": "median 28.816 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 26.696,
            "unit": "ms",
            "extra": "median 30.443 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 26.151,
            "unit": "ms",
            "extra": "median 30.348 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 28.789,
            "unit": "ms",
            "extra": "median 31.643 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 27.489,
            "unit": "ms",
            "extra": "median 31.06 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 27.2,
            "unit": "ms",
            "extra": "median 31.207 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.556,
            "unit": "ms",
            "extra": "median 8.747 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.629,
            "unit": "ms",
            "extra": "median 7.784 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.005,
            "unit": "ms",
            "extra": "median 1.188 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.995,
            "unit": "ms",
            "extra": "median 1.428 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.563,
            "unit": "ms",
            "extra": "median 1.154 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "0b242833d0b2c5bfa1f4eee2a24a37e0d9770b4a",
          "message": "feat(identity): store bug reports (#968)\n\nSigned-in users can file a bug report: POST /me/bug-reports stores route,\napp version, locale, user agent, description, steps and an optional\ncharacter id, stamped with the reporter and time. Limited to 5 reports per\nuser per hour; past that the API answers 429 (new RateLimitedError).\n\nCloses #659\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:50:43+10:00",
          "tree_id": "d63637215e7cc1a47f7347d7d7104ee76bcd3061",
          "url": "https://github.com/DavidDudson/pioneer/commit/0b242833d0b2c5bfa1f4eee2a24a37e0d9770b4a"
        },
        "date": 1792155268685,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 21,
            "unit": "ms",
            "extra": "median 23.127 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 27.836,
            "unit": "ms",
            "extra": "median 31.138 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 21.769,
            "unit": "ms",
            "extra": "median 23.532 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.813,
            "unit": "ms",
            "extra": "median 21.194 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 23.81,
            "unit": "ms",
            "extra": "median 25.936 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 23.938,
            "unit": "ms",
            "extra": "median 24.836 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 23.11,
            "unit": "ms",
            "extra": "median 25.002 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.012,
            "unit": "ms",
            "extra": "median 23.662 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 21.344,
            "unit": "ms",
            "extra": "median 23.037 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 25.803,
            "unit": "ms",
            "extra": "median 27.569 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 24.737,
            "unit": "ms",
            "extra": "median 26.275 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.632,
            "unit": "ms",
            "extra": "median 24.843 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 19.801,
            "unit": "ms",
            "extra": "median 21.219 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.011,
            "unit": "ms",
            "extra": "median 24.891 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.049,
            "unit": "ms",
            "extra": "median 22.355 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 26.858,
            "unit": "ms",
            "extra": "median 28.868 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.378,
            "unit": "ms",
            "extra": "median 21.896 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 27.673,
            "unit": "ms",
            "extra": "median 29.456 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 27.627,
            "unit": "ms",
            "extra": "median 29.426 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 26.117,
            "unit": "ms",
            "extra": "median 27.673 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 20.849,
            "unit": "ms",
            "extra": "median 21.726 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 20.989,
            "unit": "ms",
            "extra": "median 22.107 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 20.627,
            "unit": "ms",
            "extra": "median 21.857 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 21.027,
            "unit": "ms",
            "extra": "median 22.127 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 21.396,
            "unit": "ms",
            "extra": "median 22.384 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 21.923,
            "unit": "ms",
            "extra": "median 23.06 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 21.825,
            "unit": "ms",
            "extra": "median 23.018 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 20.694,
            "unit": "ms",
            "extra": "median 21.628 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.028,
            "unit": "ms",
            "extra": "median 7.286 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.214,
            "unit": "ms",
            "extra": "median 7.606 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.942,
            "unit": "ms",
            "extra": "median 1.124 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.884,
            "unit": "ms",
            "extra": "median 1.042 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.407,
            "unit": "ms",
            "extra": "median 0.943 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "6d049d9fb58fdc7c1f03e8af145ea272ce2ba6ed",
          "message": "feat(play): Start turn, End turn and the turn bar (#972)\n\n* feat(play): Start turn, End turn and the turn bar\n\nAdds the turn to play state (phase, actions, quickened action, reaction),\nthe startTurn, endTurn and leaveEncounter commands, and a turn bar on the\nEncounter tab. The server runs the bookkeeping with its own dice and\nanswers the PATCH with the events, which the bar words.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(play): ignore turn commands from the wrong phase\n\nStart turn mid-turn, End turn off-turn and Leave encounter out of one now\nchange nothing, so a direct API call can no longer run the start or end of\nturn bookkeeping twice. Also unblocks main's checks: the Pathbuilder route\ntest expected lore to be uncarried since skill slots now carry it, and\nOGL_BOOKS was exported without a user.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T22:51:48+10:00",
          "tree_id": "02addb77020d13ff2035f7cefb668caab5b5da53",
          "url": "https://github.com/DavidDudson/pioneer/commit/6d049d9fb58fdc7c1f03e8af145ea272ce2ba6ed"
        },
        "date": 1792155788538,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 29.026,
            "unit": "ms",
            "extra": "median 32.624 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 36.502,
            "unit": "ms",
            "extra": "median 38.888 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 30.423,
            "unit": "ms",
            "extra": "median 34.033 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.783,
            "unit": "ms",
            "extra": "median 31.288 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.972,
            "unit": "ms",
            "extra": "median 35.191 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 32.428,
            "unit": "ms",
            "extra": "median 36.257 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.691,
            "unit": "ms",
            "extra": "median 33.161 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 29.464,
            "unit": "ms",
            "extra": "median 33.415 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 28.137,
            "unit": "ms",
            "extra": "median 30.452 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 36.853,
            "unit": "ms",
            "extra": "median 40.208 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 32.397,
            "unit": "ms",
            "extra": "median 35.033 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 30.971,
            "unit": "ms",
            "extra": "median 33.194 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 26.862,
            "unit": "ms",
            "extra": "median 29.334 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 30.179,
            "unit": "ms",
            "extra": "median 33.074 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.091,
            "unit": "ms",
            "extra": "median 29.494 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 34.875,
            "unit": "ms",
            "extra": "median 38.094 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 26.073,
            "unit": "ms",
            "extra": "median 28.854 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 38.686,
            "unit": "ms",
            "extra": "median 42.65 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 39.934,
            "unit": "ms",
            "extra": "median 43.26 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 33.079,
            "unit": "ms",
            "extra": "median 36.974 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 26.886,
            "unit": "ms",
            "extra": "median 29.226 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 28.58,
            "unit": "ms",
            "extra": "median 30.135 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 29.125,
            "unit": "ms",
            "extra": "median 31.814 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 27.168,
            "unit": "ms",
            "extra": "median 30.189 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 32.302,
            "unit": "ms",
            "extra": "median 34.404 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 34.063,
            "unit": "ms",
            "extra": "median 35.445 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 32.67,
            "unit": "ms",
            "extra": "median 35.647 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 32.271,
            "unit": "ms",
            "extra": "median 34.633 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.045,
            "unit": "ms",
            "extra": "median 9.41 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.05,
            "unit": "ms",
            "extra": "median 7.949 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.193,
            "unit": "ms",
            "extra": "median 1.546 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.215,
            "unit": "ms",
            "extra": "median 1.569 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.567,
            "unit": "ms",
            "extra": "median 1.142 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "5a41dab5f0b54a18c5d78690c09e965c343e46d0",
          "message": "feat(spellcasting): champion devotion spells from archetype feats (#975)\n\nA champion's Devotion Spells pick Shields of the Spirit or the deity's\nfont spell (Lay on Hands, Touch of the Void) in a divine charisma\nentry. Devout Magic offers the same pick, Blessed One Dedication gives\nLay on Hands and Blessed Sacrifice Protector's Sacrifice, which Player\nCore prints (a focus spell may now be named <book>/<slug>).\n\nRefs #606\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T23:02:26+10:00",
          "tree_id": "4adba4f3e7e94e685fb37cd8ca1e749a665afa58",
          "url": "https://github.com/DavidDudson/pioneer/commit/5a41dab5f0b54a18c5d78690c09e965c343e46d0"
        },
        "date": 1792155934858,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 23.522,
            "unit": "ms",
            "extra": "median 26.109 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 32.904,
            "unit": "ms",
            "extra": "median 35.428 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 25.003,
            "unit": "ms",
            "extra": "median 28.154 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 22.759,
            "unit": "ms",
            "extra": "median 24.024 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 27.613,
            "unit": "ms",
            "extra": "median 29.637 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 26.139,
            "unit": "ms",
            "extra": "median 28.595 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 26.718,
            "unit": "ms",
            "extra": "median 28.633 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 23.796,
            "unit": "ms",
            "extra": "median 25.844 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.933,
            "unit": "ms",
            "extra": "median 25.483 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 29.05,
            "unit": "ms",
            "extra": "median 30.477 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 28.568,
            "unit": "ms",
            "extra": "median 30.332 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.102,
            "unit": "ms",
            "extra": "median 28.264 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 22.039,
            "unit": "ms",
            "extra": "median 23.102 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 25.756,
            "unit": "ms",
            "extra": "median 28.304 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 23.368,
            "unit": "ms",
            "extra": "median 24.926 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 30.895,
            "unit": "ms",
            "extra": "median 33.332 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 21.09,
            "unit": "ms",
            "extra": "median 22.14 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 31.006,
            "unit": "ms",
            "extra": "median 33.983 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 31.791,
            "unit": "ms",
            "extra": "median 35.556 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 28.761,
            "unit": "ms",
            "extra": "median 31.137 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 22.977,
            "unit": "ms",
            "extra": "median 24.424 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 23.27,
            "unit": "ms",
            "extra": "median 24.512 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 22.45,
            "unit": "ms",
            "extra": "median 23.689 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 23.454,
            "unit": "ms",
            "extra": "median 24.762 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 23.696,
            "unit": "ms",
            "extra": "median 25.742 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 24.316,
            "unit": "ms",
            "extra": "median 25.937 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 23.439,
            "unit": "ms",
            "extra": "median 25.172 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 22.829,
            "unit": "ms",
            "extra": "median 24.327 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.304,
            "unit": "ms",
            "extra": "median 7.435 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.365,
            "unit": "ms",
            "extra": "median 7.182 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.843,
            "unit": "ms",
            "extra": "median 1.007 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.977,
            "unit": "ms",
            "extra": "median 1.217 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.533,
            "unit": "ms",
            "extra": "median 1.073 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "53cd9bad994839247b6b6e066c3e98f3550692dd",
          "message": "feat(sheet): report a bug form (#976)\n\nSigned-in users get a Report a bug page at /account/report-bug, reached\nfrom the account menu and from the character sheet header. From a sheet\nthe character is attached and named before submit; the id is sent with\nthe report. Errors show under the field, the rate limit gets its own\nmessage, and the confirmation stays inline beside the form.\n\nThe route sent is the page the reporter came from; locale, build\n(APP_VERSION, `dev` until builds provide one) and browser are read from\nthe app. fr-link gains queryParams. The sheet's header actions move\ninto one component to stay under the dependency limit.\n\nCloses #660\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T23:07:35+10:00",
          "tree_id": "92ab3c73b899ab66a875722dbfd1e5ac1d070550",
          "url": "https://github.com/DavidDudson/pioneer/commit/53cd9bad994839247b6b6e066c3e98f3550692dd"
        },
        "date": 1792156237946,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 23.344,
            "unit": "ms",
            "extra": "median 26.527 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 32.977,
            "unit": "ms",
            "extra": "median 35.281 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 24.852,
            "unit": "ms",
            "extra": "median 28.02 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 22.248,
            "unit": "ms",
            "extra": "median 23.821 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 26.843,
            "unit": "ms",
            "extra": "median 29.068 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 25.548,
            "unit": "ms",
            "extra": "median 28.104 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 25.879,
            "unit": "ms",
            "extra": "median 28.161 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 23.748,
            "unit": "ms",
            "extra": "median 26.288 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.445,
            "unit": "ms",
            "extra": "median 26.895 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 29.421,
            "unit": "ms",
            "extra": "median 31.988 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 29.595,
            "unit": "ms",
            "extra": "median 31.387 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 25.95,
            "unit": "ms",
            "extra": "median 29.458 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 21.977,
            "unit": "ms",
            "extra": "median 25.149 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 25.575,
            "unit": "ms",
            "extra": "median 28.465 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.713,
            "unit": "ms",
            "extra": "median 25.128 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 30.047,
            "unit": "ms",
            "extra": "median 35.05 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 21.049,
            "unit": "ms",
            "extra": "median 23.454 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 30.615,
            "unit": "ms",
            "extra": "median 33.066 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 31.422,
            "unit": "ms",
            "extra": "median 34.469 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 28.597,
            "unit": "ms",
            "extra": "median 32.891 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 22.695,
            "unit": "ms",
            "extra": "median 25.271 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 23.967,
            "unit": "ms",
            "extra": "median 25.552 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 22.491,
            "unit": "ms",
            "extra": "median 24 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 23.701,
            "unit": "ms",
            "extra": "median 25.707 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 22.91,
            "unit": "ms",
            "extra": "median 25.07 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 24.325,
            "unit": "ms",
            "extra": "median 25.819 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 24.117,
            "unit": "ms",
            "extra": "median 27.237 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 23.736,
            "unit": "ms",
            "extra": "median 25.767 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.599,
            "unit": "ms",
            "extra": "median 8.311 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.762,
            "unit": "ms",
            "extra": "median 7.701 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.025,
            "unit": "ms",
            "extra": "median 1.19 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.987,
            "unit": "ms",
            "extra": "median 1.277 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.564,
            "unit": "ms",
            "extra": "median 1.084 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "a731a1fd99c6ee0a9260083e963deec64d2e1198",
          "message": "feat(engine): put the build's rule elements in play for statistics (#984)\n\n* fix(interop): allow undefined optional focus DC fields\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(engine): put the build's rule elements in play for statistics\n\nFeats, class features, ancestry and background rules were resolved but\nnever fed to the engine, so Toughness and the like added nothing to hp:max.\nCloses the Mordred max HP gap in the Pathbuilder golden test.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T23:29:44+10:00",
          "tree_id": "48fc55b6b834d3f9611e9754fcbfd5eb06e06b6f",
          "url": "https://github.com/DavidDudson/pioneer/commit/a731a1fd99c6ee0a9260083e963deec64d2e1198"
        },
        "date": 1792157682984,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 28.742,
            "unit": "ms",
            "extra": "median 32.209 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 42.59,
            "unit": "ms",
            "extra": "median 45.167 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 31.603,
            "unit": "ms",
            "extra": "median 34.322 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 29.191,
            "unit": "ms",
            "extra": "median 33.169 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 35.182,
            "unit": "ms",
            "extra": "median 37.173 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 34.885,
            "unit": "ms",
            "extra": "median 36.991 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 33.213,
            "unit": "ms",
            "extra": "median 36.499 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 32.014,
            "unit": "ms",
            "extra": "median 35.857 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 29.274,
            "unit": "ms",
            "extra": "median 32.587 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 37.61,
            "unit": "ms",
            "extra": "median 39.999 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 33.908,
            "unit": "ms",
            "extra": "median 38.194 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 33.102,
            "unit": "ms",
            "extra": "median 36.602 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 25.959,
            "unit": "ms",
            "extra": "median 28.67 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 29.906,
            "unit": "ms",
            "extra": "median 32.869 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.616,
            "unit": "ms",
            "extra": "median 31.206 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 37.603,
            "unit": "ms",
            "extra": "median 40.241 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 23.747,
            "unit": "ms",
            "extra": "median 26.189 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 36.555,
            "unit": "ms",
            "extra": "median 40.374 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 38.89,
            "unit": "ms",
            "extra": "median 42.707 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 34.609,
            "unit": "ms",
            "extra": "median 39.234 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 28.526,
            "unit": "ms",
            "extra": "median 31.908 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 27.744,
            "unit": "ms",
            "extra": "median 30.555 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 27.577,
            "unit": "ms",
            "extra": "median 32.344 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 28.464,
            "unit": "ms",
            "extra": "median 30.59 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 29.507,
            "unit": "ms",
            "extra": "median 32.181 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 29.592,
            "unit": "ms",
            "extra": "median 32.389 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 29.958,
            "unit": "ms",
            "extra": "median 32.73 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 28.508,
            "unit": "ms",
            "extra": "median 31.212 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.263,
            "unit": "ms",
            "extra": "median 8.475 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.925,
            "unit": "ms",
            "extra": "median 7.812 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.004,
            "unit": "ms",
            "extra": "median 1.176 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.988,
            "unit": "ms",
            "extra": "median 1.338 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.547,
            "unit": "ms",
            "extra": "median 1.155 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "2a65b507ee14b3c0f420be7715b6a41ee8119b38",
          "message": "feat(identity): bug report snapshots the character (#985)\n\nA report can carry a frozen copy of the character's stored inputs, as the\nPioneer character file holds them (format and formatVersion included), so\nmaintainers see what the reporter saw. Later edits never reach the copy.\n\n- identity defines CharacterSnapshotSource; the composition root wires it\n  to the Pioneer file export, which applies the owner-only access policy\n- the server reads the character itself; the client sends only a flag\n- sharing is off in the contract unless asked; the form ticks it by default\n  and the reporter can untick it\n- a character that is gone or can't be exported never blocks the report:\n  it is filed without a snapshot and the receipt (snapshotTaken) says so\n- bug_reports.snapshot jsonb, migration 0030\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T23:32:28+10:00",
          "tree_id": "1c1293c786801f9c915f89d5a438a70b5019f966",
          "url": "https://github.com/DavidDudson/pioneer/commit/2a65b507ee14b3c0f420be7715b6a41ee8119b38"
        },
        "date": 1792158163990,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 37.464,
            "unit": "ms",
            "extra": "median 41.265 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 49.273,
            "unit": "ms",
            "extra": "median 53.361 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 38.787,
            "unit": "ms",
            "extra": "median 41.56 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 36.695,
            "unit": "ms",
            "extra": "median 39.042 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 41.757,
            "unit": "ms",
            "extra": "median 45.559 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 41.18,
            "unit": "ms",
            "extra": "median 45.506 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 40.322,
            "unit": "ms",
            "extra": "median 43.15 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 36.831,
            "unit": "ms",
            "extra": "median 40.66 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 36.006,
            "unit": "ms",
            "extra": "median 39.45 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 43.967,
            "unit": "ms",
            "extra": "median 47.437 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 41.543,
            "unit": "ms",
            "extra": "median 44.915 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 40.432,
            "unit": "ms",
            "extra": "median 43.473 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 34.182,
            "unit": "ms",
            "extra": "median 36.86 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 39.158,
            "unit": "ms",
            "extra": "median 42.23 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 34.784,
            "unit": "ms",
            "extra": "median 37.675 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 45.216,
            "unit": "ms",
            "extra": "median 48.949 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 32.657,
            "unit": "ms",
            "extra": "median 36.223 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 46.994,
            "unit": "ms",
            "extra": "median 51.671 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 47.612,
            "unit": "ms",
            "extra": "median 51.177 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 42.429,
            "unit": "ms",
            "extra": "median 45.494 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 36.385,
            "unit": "ms",
            "extra": "median 40.062 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 35.121,
            "unit": "ms",
            "extra": "median 40.804 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 34.542,
            "unit": "ms",
            "extra": "median 38.429 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 36.079,
            "unit": "ms",
            "extra": "median 39.336 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 36.906,
            "unit": "ms",
            "extra": "median 40.643 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 38.631,
            "unit": "ms",
            "extra": "median 41.252 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 36.841,
            "unit": "ms",
            "extra": "median 40.628 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 35.08,
            "unit": "ms",
            "extra": "median 38 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.241,
            "unit": "ms",
            "extra": "median 8.811 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.342,
            "unit": "ms",
            "extra": "median 8.556 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.186,
            "unit": "ms",
            "extra": "median 1.531 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.351,
            "unit": "ms",
            "extra": "median 1.728 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.62,
            "unit": "ms",
            "extra": "median 1.202 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "eaf2c506747b46189c2842e77c184ce7bda49032",
          "message": "docs: table of formatters and linters in CLAUDE.md (#988)\n\nName oxfmt as the formatter and ban Prettier, and list every\nformatter, linter and check with its check and fix commands.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T23:40:04+10:00",
          "tree_id": "464eced422ae18153c9b72533d8f2fd639f0b166",
          "url": "https://github.com/DavidDudson/pioneer/commit/eaf2c506747b46189c2842e77c184ce7bda49032"
        },
        "date": 1792158626641,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 27.835,
            "unit": "ms",
            "extra": "median 30.276 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 37.981,
            "unit": "ms",
            "extra": "median 40.977 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 27.717,
            "unit": "ms",
            "extra": "median 29.552 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.141,
            "unit": "ms",
            "extra": "median 30.744 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.96,
            "unit": "ms",
            "extra": "median 33.418 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 32.131,
            "unit": "ms",
            "extra": "median 34.275 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.135,
            "unit": "ms",
            "extra": "median 32.123 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 26.358,
            "unit": "ms",
            "extra": "median 28.458 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 26.8,
            "unit": "ms",
            "extra": "median 29.033 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 35.046,
            "unit": "ms",
            "extra": "median 37.678 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 33.115,
            "unit": "ms",
            "extra": "median 35.321 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 31.47,
            "unit": "ms",
            "extra": "median 33.657 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 25.404,
            "unit": "ms",
            "extra": "median 26.781 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 29.869,
            "unit": "ms",
            "extra": "median 32.857 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 26.759,
            "unit": "ms",
            "extra": "median 29.265 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 36.194,
            "unit": "ms",
            "extra": "median 40.357 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 23.974,
            "unit": "ms",
            "extra": "median 25.357 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 36.78,
            "unit": "ms",
            "extra": "median 39.971 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 36.542,
            "unit": "ms",
            "extra": "median 39.477 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 33.757,
            "unit": "ms",
            "extra": "median 37.571 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.108,
            "unit": "ms",
            "extra": "median 29.992 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 26.672,
            "unit": "ms",
            "extra": "median 29.043 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 26.392,
            "unit": "ms",
            "extra": "median 28.399 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 26.8,
            "unit": "ms",
            "extra": "median 29.535 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 28.092,
            "unit": "ms",
            "extra": "median 30.098 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 28.292,
            "unit": "ms",
            "extra": "median 30.516 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 28.08,
            "unit": "ms",
            "extra": "median 30.477 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 26.944,
            "unit": "ms",
            "extra": "median 28.684 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.152,
            "unit": "ms",
            "extra": "median 9.235 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.505,
            "unit": "ms",
            "extra": "median 8.878 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.9,
            "unit": "ms",
            "extra": "median 1.149 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.026,
            "unit": "ms",
            "extra": "median 1.447 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.525,
            "unit": "ms",
            "extra": "median 1.056 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "d0d806ab7e5424c6ac771d8e5caf6a255cd8b3be",
          "message": "feat(frontier): fr-drawer docked side panel (#997)\n\nCloses #954\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T07:40:18+10:00",
          "tree_id": "6873300c8b68d5f707320f5f12a7b52aad04a8e2",
          "url": "https://github.com/DavidDudson/pioneer/commit/d0d806ab7e5424c6ac771d8e5caf6a255cd8b3be"
        },
        "date": 1792186977071,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 31.751,
            "unit": "ms",
            "extra": "median 33.463 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 42.196,
            "unit": "ms",
            "extra": "median 43.808 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 32.18,
            "unit": "ms",
            "extra": "median 33.576 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 30.072,
            "unit": "ms",
            "extra": "median 32.08 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 35.408,
            "unit": "ms",
            "extra": "median 36.83 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 34.944,
            "unit": "ms",
            "extra": "median 37.134 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 33.542,
            "unit": "ms",
            "extra": "median 36.023 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 30.576,
            "unit": "ms",
            "extra": "median 32.436 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 30.137,
            "unit": "ms",
            "extra": "median 32.548 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 38.448,
            "unit": "ms",
            "extra": "median 40.638 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 37.478,
            "unit": "ms",
            "extra": "median 38.899 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 34.975,
            "unit": "ms",
            "extra": "median 37.162 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 29.84,
            "unit": "ms",
            "extra": "median 31.887 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 33.828,
            "unit": "ms",
            "extra": "median 36.012 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 31.1,
            "unit": "ms",
            "extra": "median 32.846 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 40.117,
            "unit": "ms",
            "extra": "median 42.073 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 28.476,
            "unit": "ms",
            "extra": "median 29.444 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 39.249,
            "unit": "ms",
            "extra": "median 41.609 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 41.251,
            "unit": "ms",
            "extra": "median 43.395 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 37.878,
            "unit": "ms",
            "extra": "median 39.667 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 31.362,
            "unit": "ms",
            "extra": "median 33.306 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 31.197,
            "unit": "ms",
            "extra": "median 32.788 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 30.911,
            "unit": "ms",
            "extra": "median 32.556 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 30.324,
            "unit": "ms",
            "extra": "median 33.187 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 32.394,
            "unit": "ms",
            "extra": "median 34.151 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 32.714,
            "unit": "ms",
            "extra": "median 34.439 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 31.815,
            "unit": "ms",
            "extra": "median 34.123 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 31.381,
            "unit": "ms",
            "extra": "median 33.223 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.652,
            "unit": "ms",
            "extra": "median 8.823 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.172,
            "unit": "ms",
            "extra": "median 8.113 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.05,
            "unit": "ms",
            "extra": "median 1.229 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.989,
            "unit": "ms",
            "extra": "median 1.213 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.459,
            "unit": "ms",
            "extra": "median 1.024 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "e9c8fd87a857e961c806255bd00ab8bd5e875927",
          "message": "feat(play): choose an exploration activity (#990)\n\nThe Exploration tab picks what the character is doing while exploring\n(Defend, Search, Avoid Notice, Follow the Expert). The id of the action\nis play state, set by setExplorationActivity; the server refuses an\naction that is not an exploration one. suggestedInitiative gives the\nactivity's skill, else Perception, for the initiative roll.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T07:42:27+10:00",
          "tree_id": "f1d161734dd313857c2cb61edbe2782df20bfb3d",
          "url": "https://github.com/DavidDudson/pioneer/commit/e9c8fd87a857e961c806255bd00ab8bd5e875927"
        },
        "date": 1792187243131,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 28.894,
            "unit": "ms",
            "extra": "median 33.569 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 40.567,
            "unit": "ms",
            "extra": "median 43.372 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 28.072,
            "unit": "ms",
            "extra": "median 29.809 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.006,
            "unit": "ms",
            "extra": "median 27.952 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.782,
            "unit": "ms",
            "extra": "median 34.047 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 32.057,
            "unit": "ms",
            "extra": "median 34.101 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 31.024,
            "unit": "ms",
            "extra": "median 33.668 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 27.177,
            "unit": "ms",
            "extra": "median 29.258 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 27.63,
            "unit": "ms",
            "extra": "median 28.928 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 34.588,
            "unit": "ms",
            "extra": "median 36.851 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 32.874,
            "unit": "ms",
            "extra": "median 34.966 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 31.591,
            "unit": "ms",
            "extra": "median 34.42 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 25.417,
            "unit": "ms",
            "extra": "median 27.429 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 29.896,
            "unit": "ms",
            "extra": "median 32.106 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 26.942,
            "unit": "ms",
            "extra": "median 28.835 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 36.103,
            "unit": "ms",
            "extra": "median 39.244 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 24.571,
            "unit": "ms",
            "extra": "median 26.159 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 36.608,
            "unit": "ms",
            "extra": "median 39.579 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 38.391,
            "unit": "ms",
            "extra": "median 43.601 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 35.343,
            "unit": "ms",
            "extra": "median 37.949 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 28.27,
            "unit": "ms",
            "extra": "median 30.492 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 28.218,
            "unit": "ms",
            "extra": "median 30.742 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 27.207,
            "unit": "ms",
            "extra": "median 29.537 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 27.647,
            "unit": "ms",
            "extra": "median 30.122 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 28.875,
            "unit": "ms",
            "extra": "median 32.525 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 31.333,
            "unit": "ms",
            "extra": "median 34.577 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 30.815,
            "unit": "ms",
            "extra": "median 34.191 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 29.586,
            "unit": "ms",
            "extra": "median 32.027 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.863,
            "unit": "ms",
            "extra": "median 8.322 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.033,
            "unit": "ms",
            "extra": "median 8.248 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.878,
            "unit": "ms",
            "extra": "median 1.08 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.996,
            "unit": "ms",
            "extra": "median 1.228 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.533,
            "unit": "ms",
            "extra": "median 1.097 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "7c1b6a242a2c96a6835adaa559410cbf5a941796",
          "message": "feat(identity): maintainer role on accounts (#991)\n\n* feat(identity): maintainer role on accounts\n\nAccounts are members unless made maintainers, who triage bug reports.\nThe role is a column on users (migration 0031) and part of User and its\nwire shape. It is granted from the command line only:\n\n  pioneer-api grant-maintainer <user-id>\n\nso nothing a signed-in user sends can raise it.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(identity): maintainers triage bug reports over the API (#999)\n\nMaintainers can list the newest reports, read one with its snapshot,\nand set where it stands: open, confirmed, fixed or declined. To anyone\nwho is not a maintainer these are a 404, so a member learns nothing.\n\n- BugReportTriageService checks the role on every call\n- GET /bug-reports, GET and PATCH /bug-reports/:id\n- the list is newest first, capped at 100, backed by an index on\n  created_at (migration 0032)\n- status closed becomes fixed (migration 0033)\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-16T21:43:35Z",
          "tree_id": "a6675fb14094b9af630e3b0f6057e4e83de1c513",
          "url": "https://github.com/DavidDudson/pioneer/commit/7c1b6a242a2c96a6835adaa559410cbf5a941796"
        },
        "date": 1792187449963,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 27.18,
            "unit": "ms",
            "extra": "median 29.47 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 38.419,
            "unit": "ms",
            "extra": "median 41.068 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 28.012,
            "unit": "ms",
            "extra": "median 31.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.012,
            "unit": "ms",
            "extra": "median 29.3 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 32.293,
            "unit": "ms",
            "extra": "median 35.904 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 31.425,
            "unit": "ms",
            "extra": "median 32.965 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 29.949,
            "unit": "ms",
            "extra": "median 31.134 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 26.452,
            "unit": "ms",
            "extra": "median 28.145 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 26.54,
            "unit": "ms",
            "extra": "median 28.029 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 34.539,
            "unit": "ms",
            "extra": "median 37.041 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 31.851,
            "unit": "ms",
            "extra": "median 33.609 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 30.822,
            "unit": "ms",
            "extra": "median 32.526 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 24.922,
            "unit": "ms",
            "extra": "median 25.821 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 29.215,
            "unit": "ms",
            "extra": "median 31.083 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.216,
            "unit": "ms",
            "extra": "median 30.049 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 36.487,
            "unit": "ms",
            "extra": "median 40.511 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 24.977,
            "unit": "ms",
            "extra": "median 27.618 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 38.048,
            "unit": "ms",
            "extra": "median 41.504 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 38.52,
            "unit": "ms",
            "extra": "median 42.806 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 34.149,
            "unit": "ms",
            "extra": "median 38.519 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 26.925,
            "unit": "ms",
            "extra": "median 28.622 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 26.821,
            "unit": "ms",
            "extra": "median 30.231 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 26.223,
            "unit": "ms",
            "extra": "median 27.477 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 26.756,
            "unit": "ms",
            "extra": "median 27.457 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 28.156,
            "unit": "ms",
            "extra": "median 30.473 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 28.672,
            "unit": "ms",
            "extra": "median 30.196 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 29.115,
            "unit": "ms",
            "extra": "median 31.682 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 26.991,
            "unit": "ms",
            "extra": "median 28.889 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.478,
            "unit": "ms",
            "extra": "median 8.414 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.671,
            "unit": "ms",
            "extra": "median 8.256 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.849,
            "unit": "ms",
            "extra": "median 1.01 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.97,
            "unit": "ms",
            "extra": "median 1.161 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.517,
            "unit": "ms",
            "extra": "median 1.039 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "03b537bda7e1523bfc3f1d0b70b0435039dcab19",
          "message": "feat(content): import Season of Ghosts from Foundry (#1002)\n\nImports the remaster ORC content of the Season of Ghosts hardcover at\npf2e-8.6.0 into its own pack, with its backlog and the vocabulary it adds to\ncore-rules. Registers the book, maps Foundry's publication title, and lists it\nin NOTICE.md, the Legal page and the ORC attribution.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T07:49:13+10:00",
          "tree_id": "4b0f8c1de4b900f9aa4093cff7f4d31daf064422",
          "url": "https://github.com/DavidDudson/pioneer/commit/03b537bda7e1523bfc3f1d0b70b0435039dcab19"
        },
        "date": 1792187628633,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 23.712,
            "unit": "ms",
            "extra": "median 25.778 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 31.954,
            "unit": "ms",
            "extra": "median 34.701 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 24.051,
            "unit": "ms",
            "extra": "median 25.681 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 21.494,
            "unit": "ms",
            "extra": "median 24.189 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 26.984,
            "unit": "ms",
            "extra": "median 28.578 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 26.719,
            "unit": "ms",
            "extra": "median 29.431 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 26.082,
            "unit": "ms",
            "extra": "median 27.824 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.841,
            "unit": "ms",
            "extra": "median 24.146 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.272,
            "unit": "ms",
            "extra": "median 25.161 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 29.257,
            "unit": "ms",
            "extra": "median 31.404 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.489,
            "unit": "ms",
            "extra": "median 30.307 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.946,
            "unit": "ms",
            "extra": "median 32.405 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 21.88,
            "unit": "ms",
            "extra": "median 23.275 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 25.173,
            "unit": "ms",
            "extra": "median 27.731 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.461,
            "unit": "ms",
            "extra": "median 25.4 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 29.733,
            "unit": "ms",
            "extra": "median 32.413 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 20.427,
            "unit": "ms",
            "extra": "median 22.363 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 30.594,
            "unit": "ms",
            "extra": "median 32.58 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 32.178,
            "unit": "ms",
            "extra": "median 34.406 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 28.698,
            "unit": "ms",
            "extra": "median 31.173 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 23.507,
            "unit": "ms",
            "extra": "median 24.981 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 22.102,
            "unit": "ms",
            "extra": "median 24.725 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 22.546,
            "unit": "ms",
            "extra": "median 23.949 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 22.772,
            "unit": "ms",
            "extra": "median 24.877 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 24.675,
            "unit": "ms",
            "extra": "median 26.502 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 24.345,
            "unit": "ms",
            "extra": "median 30.184 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 23.43,
            "unit": "ms",
            "extra": "median 26.46 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 23.057,
            "unit": "ms",
            "extra": "median 24.84 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.392,
            "unit": "ms",
            "extra": "median 7.13 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.894,
            "unit": "ms",
            "extra": "median 6.7 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.742,
            "unit": "ms",
            "extra": "median 0.973 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.781,
            "unit": "ms",
            "extra": "median 1.038 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.408,
            "unit": "ms",
            "extra": "median 0.766 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "8c0b21429550914c226abe026c8846cf403b0fc1",
          "message": "feat(identity): maintainer bug report list and report page (#1001)\n\n* fix(identity): report bug page uses the composable page parts\n\n#977 replaced the fr-page title and description inputs with fr-page-header\nand fr-page-body; the report bug page still bound the old ones, so the\nidentity feature no longer compiled.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(identity): maintainer bug report list and report page\n\nMaintainers get a list of bug reports at /account/bug-reports (status,\nwhat was reported, page, reporter, date, whether a character came with\nit) and a page per report to read it in full, set where it stands, and\nsave the shared character as a Pioneer character file. The file opens\nwith the character import, as a copy of the maintainer's own, since the\nsheet has no read-only mode.\n\nThe account menu links to the list for maintainers only. Anyone else\nwho opens it gets the API's 404 as a load error. ADR-0065 records the\ndecision to keep reports in the database rather than GitHub issues.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T07:52:53+10:00",
          "tree_id": "6e26bbe43830f98322a7ab15c193d36c295a6f43",
          "url": "https://github.com/DavidDudson/pioneer/commit/8c0b21429550914c226abe026c8846cf403b0fc1"
        },
        "date": 1792187772338,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 22.072,
            "unit": "ms",
            "extra": "median 24.474 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 31.653,
            "unit": "ms",
            "extra": "median 33.781 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 23.035,
            "unit": "ms",
            "extra": "median 24.434 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 21.768,
            "unit": "ms",
            "extra": "median 23.186 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 25.865,
            "unit": "ms",
            "extra": "median 27.451 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 26.076,
            "unit": "ms",
            "extra": "median 28.141 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 25.022,
            "unit": "ms",
            "extra": "median 26.664 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.759,
            "unit": "ms",
            "extra": "median 23.963 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 22.691,
            "unit": "ms",
            "extra": "median 23.827 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 28.382,
            "unit": "ms",
            "extra": "median 30.606 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.104,
            "unit": "ms",
            "extra": "median 28.833 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.134,
            "unit": "ms",
            "extra": "median 28.099 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 21.364,
            "unit": "ms",
            "extra": "median 22.947 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 24.674,
            "unit": "ms",
            "extra": "median 26.516 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.722,
            "unit": "ms",
            "extra": "median 24.472 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 29.473,
            "unit": "ms",
            "extra": "median 31.652 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 20.41,
            "unit": "ms",
            "extra": "median 21.684 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.668,
            "unit": "ms",
            "extra": "median 32.236 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 30.242,
            "unit": "ms",
            "extra": "median 33.033 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 27.883,
            "unit": "ms",
            "extra": "median 30.035 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 22.73,
            "unit": "ms",
            "extra": "median 24.428 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 23.111,
            "unit": "ms",
            "extra": "median 24.638 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 22.438,
            "unit": "ms",
            "extra": "median 23.667 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 22.504,
            "unit": "ms",
            "extra": "median 23.943 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 23.487,
            "unit": "ms",
            "extra": "median 25.232 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 23.926,
            "unit": "ms",
            "extra": "median 25.698 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 23.639,
            "unit": "ms",
            "extra": "median 25.656 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 23.047,
            "unit": "ms",
            "extra": "median 24.724 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.583,
            "unit": "ms",
            "extra": "median 7.584 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.829,
            "unit": "ms",
            "extra": "median 7.513 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.655,
            "unit": "ms",
            "extra": "median 0.848 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.668,
            "unit": "ms",
            "extra": "median 0.966 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.338,
            "unit": "ms",
            "extra": "median 0.802 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "4c625f8c9874513f9e1e8b54662408e1583ca97a",
          "message": "feat(content): import Hellbreakers from Foundry (#1004)\n\nImports the remaster ORC content of the Hellbreakers adventure path at\npf2e-8.6.0 into its own pack, with its backlog. Registers the book, maps\nFoundry's publication title, and lists it in NOTICE.md, the Legal page and the\nORC attribution.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T08:12:01+10:00",
          "tree_id": "42635e1855ab2c57bfef62533bf7c89f6cfc072d",
          "url": "https://github.com/DavidDudson/pioneer/commit/4c625f8c9874513f9e1e8b54662408e1583ca97a"
        },
        "date": 1792188872285,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 26.662,
            "unit": "ms",
            "extra": "median 28.619 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 38.376,
            "unit": "ms",
            "extra": "median 39.842 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 27.758,
            "unit": "ms",
            "extra": "median 28.801 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 25.772,
            "unit": "ms",
            "extra": "median 26.945 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.258,
            "unit": "ms",
            "extra": "median 32.317 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 31.24,
            "unit": "ms",
            "extra": "median 32.518 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.522,
            "unit": "ms",
            "extra": "median 31.711 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 26.695,
            "unit": "ms",
            "extra": "median 27.743 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 26.64,
            "unit": "ms",
            "extra": "median 27.667 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 34.539,
            "unit": "ms",
            "extra": "median 35.768 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 32.277,
            "unit": "ms",
            "extra": "median 33.267 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 31.321,
            "unit": "ms",
            "extra": "median 32.542 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 25.37,
            "unit": "ms",
            "extra": "median 26.474 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 29.246,
            "unit": "ms",
            "extra": "median 30.995 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 26.927,
            "unit": "ms",
            "extra": "median 28.652 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 35.718,
            "unit": "ms",
            "extra": "median 37.905 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 23.814,
            "unit": "ms",
            "extra": "median 25.186 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 35.83,
            "unit": "ms",
            "extra": "median 37.344 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 36.897,
            "unit": "ms",
            "extra": "median 39.154 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 33.626,
            "unit": "ms",
            "extra": "median 35.204 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 26.803,
            "unit": "ms",
            "extra": "median 28.197 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 26.715,
            "unit": "ms",
            "extra": "median 28.057 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 26.086,
            "unit": "ms",
            "extra": "median 27.466 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 26.065,
            "unit": "ms",
            "extra": "median 27.848 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 27.823,
            "unit": "ms",
            "extra": "median 29.102 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 27.645,
            "unit": "ms",
            "extra": "median 29.584 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 27.609,
            "unit": "ms",
            "extra": "median 29.637 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 26.528,
            "unit": "ms",
            "extra": "median 28.81 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.952,
            "unit": "ms",
            "extra": "median 8.681 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.453,
            "unit": "ms",
            "extra": "median 8.22 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.814,
            "unit": "ms",
            "extra": "median 1.021 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.882,
            "unit": "ms",
            "extra": "median 1.203 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.696,
            "unit": "ms",
            "extra": "median 1.088 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "8138d1954b40c576fa993c06422fc3737f45db59",
          "message": "feat(play): roll initiative on entering an encounter (#1005)\n\nEnter encounter moves a character from out of an encounter to off-turn\nand opens the initiative picker: Perception or any skill or Lore with\nits modifier, starting on the skill the exploration activity suggests.\nThe roll is made as an initiative check (the initiative domain and the\ncheck and participant initiative roll options), so initiative-only\nmodifiers count. It goes to the last roll and nothing about it is play\nstate; it can be rolled again or skipped.\n\nRefs #506\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T08:13:29+10:00",
          "tree_id": "f89c9228bf5eb8131e3884d1178b079410ce855a",
          "url": "https://github.com/DavidDudson/pioneer/commit/8138d1954b40c576fa993c06422fc3737f45db59"
        },
        "date": 1792189195539,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 29.123,
            "unit": "ms",
            "extra": "median 33.162 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 41.237,
            "unit": "ms",
            "extra": "median 45.518 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 31.277,
            "unit": "ms",
            "extra": "median 33.998 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 27.829,
            "unit": "ms",
            "extra": "median 30.178 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 34.082,
            "unit": "ms",
            "extra": "median 37.476 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 34.28,
            "unit": "ms",
            "extra": "median 36.85 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 32.277,
            "unit": "ms",
            "extra": "median 36.764 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 29.632,
            "unit": "ms",
            "extra": "median 33.445 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 30.623,
            "unit": "ms",
            "extra": "median 34.348 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 36.079,
            "unit": "ms",
            "extra": "median 38.722 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 34.192,
            "unit": "ms",
            "extra": "median 36.467 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 33.487,
            "unit": "ms",
            "extra": "median 36.644 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 27.263,
            "unit": "ms",
            "extra": "median 28.727 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 31.792,
            "unit": "ms",
            "extra": "median 36.095 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 28.749,
            "unit": "ms",
            "extra": "median 32.417 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 38.992,
            "unit": "ms",
            "extra": "median 43.287 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 26.549,
            "unit": "ms",
            "extra": "median 30.308 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 39.484,
            "unit": "ms",
            "extra": "median 42.591 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 40.136,
            "unit": "ms",
            "extra": "median 43.613 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 36.763,
            "unit": "ms",
            "extra": "median 39.209 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 29.411,
            "unit": "ms",
            "extra": "median 31.419 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 28.412,
            "unit": "ms",
            "extra": "median 31.256 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 28.242,
            "unit": "ms",
            "extra": "median 30.684 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 28.809,
            "unit": "ms",
            "extra": "median 30.191 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 30.481,
            "unit": "ms",
            "extra": "median 32.686 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 31.805,
            "unit": "ms",
            "extra": "median 36.056 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 31.771,
            "unit": "ms",
            "extra": "median 38.289 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 30.675,
            "unit": "ms",
            "extra": "median 34.975 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.255,
            "unit": "ms",
            "extra": "median 8.8 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.662,
            "unit": "ms",
            "extra": "median 8.556 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.912,
            "unit": "ms",
            "extra": "median 1.213 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.075,
            "unit": "ms",
            "extra": "median 1.263 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.517,
            "unit": "ms",
            "extra": "median 1.04 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "3bcee339c1e5fb304308a39e67c7f9a087a6a934",
          "message": "feat(interop): compare Pathbuilder spell slots a day (#1007)\n\nCompare each prepared or spontaneous caster's perDay with the slots of\nthe entry that casts the same way, cantrips and each rank, and report\nthe ranks that differ as spell-slots:<entry>:<rank> rows (#311). The\npairing moves to its own module, shared with spell placement.\n\nBoth fixtures' slots match the engine's, so no new golden differences.\n\nRefs #311 feat(interop): import Pathbuilder spellcasting and focus spells\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T08:24:31+10:00",
          "tree_id": "5eb1152ddbe8bc2c3749de74cb28ff34ed506bc4",
          "url": "https://github.com/DavidDudson/pioneer/commit/3bcee339c1e5fb304308a39e67c7f9a087a6a934"
        },
        "date": 1792189632049,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 22.353,
            "unit": "ms",
            "extra": "median 26.088 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 33.259,
            "unit": "ms",
            "extra": "median 39.249 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 25.448,
            "unit": "ms",
            "extra": "median 27.831 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 22.502,
            "unit": "ms",
            "extra": "median 24.748 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 27.443,
            "unit": "ms",
            "extra": "median 29.523 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 27.897,
            "unit": "ms",
            "extra": "median 30.24 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 25.32,
            "unit": "ms",
            "extra": "median 28.213 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 22.793,
            "unit": "ms",
            "extra": "median 25.291 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 22.331,
            "unit": "ms",
            "extra": "median 24.238 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 28.775,
            "unit": "ms",
            "extra": "median 30.935 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 26.621,
            "unit": "ms",
            "extra": "median 29.599 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.491,
            "unit": "ms",
            "extra": "median 29.563 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 21.147,
            "unit": "ms",
            "extra": "median 23.075 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 24.846,
            "unit": "ms",
            "extra": "median 28.171 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.022,
            "unit": "ms",
            "extra": "median 24.85 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 30.159,
            "unit": "ms",
            "extra": "median 33.577 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 20.375,
            "unit": "ms",
            "extra": "median 22.25 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.707,
            "unit": "ms",
            "extra": "median 32.73 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 30.911,
            "unit": "ms",
            "extra": "median 34.011 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 29.654,
            "unit": "ms",
            "extra": "median 32.934 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 22.541,
            "unit": "ms",
            "extra": "median 24.597 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 22.708,
            "unit": "ms",
            "extra": "median 24.807 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 22.399,
            "unit": "ms",
            "extra": "median 24.443 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 22.321,
            "unit": "ms",
            "extra": "median 24.344 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 23.719,
            "unit": "ms",
            "extra": "median 25.906 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 23.804,
            "unit": "ms",
            "extra": "median 25.99 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 23.62,
            "unit": "ms",
            "extra": "median 25.779 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 22.634,
            "unit": "ms",
            "extra": "median 25.945 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.353,
            "unit": "ms",
            "extra": "median 7.845 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.533,
            "unit": "ms",
            "extra": "median 7.58 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.671,
            "unit": "ms",
            "extra": "median 0.829 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.847,
            "unit": "ms",
            "extra": "median 0.94 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.39,
            "unit": "ms",
            "extra": "median 0.852 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "4017575068b15ba582d428b3cf0117518ea55d47",
          "message": "feat(interop): keep over-cap Pathbuilder gear and mark it as imported (#989)\n\n* fix(interop): let focusDc take undefined bonuses\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(interop): keep over-cap Pathbuilder gear as imported\n\nStop truncating property runes and capping invested items on import.\nEvery imported line carries origin 'import', so the sheet flags what\nbreaks the limits instead of the importer dropping it. The import\nreport counts the rule-breaking items and links to the inventory.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test(sheet): property tests for rule violations, accept ADR 0064\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T08:38:11+10:00",
          "tree_id": "e63d76f2abb9a1068dc8aa1b4251b02297d35eac",
          "url": "https://github.com/DavidDudson/pioneer/commit/4017575068b15ba582d428b3cf0117518ea55d47"
        },
        "date": 1792190458084,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 32.105,
            "unit": "ms",
            "extra": "median 35.082 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 42.604,
            "unit": "ms",
            "extra": "median 45.431 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 31.583,
            "unit": "ms",
            "extra": "median 34.642 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 30.127,
            "unit": "ms",
            "extra": "median 33.018 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 33.231,
            "unit": "ms",
            "extra": "median 36.808 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 33.134,
            "unit": "ms",
            "extra": "median 38.018 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 33.633,
            "unit": "ms",
            "extra": "median 37.316 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 30.535,
            "unit": "ms",
            "extra": "median 33.251 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 31.219,
            "unit": "ms",
            "extra": "median 34.217 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 35.952,
            "unit": "ms",
            "extra": "median 40.243 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 35.025,
            "unit": "ms",
            "extra": "median 39.814 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 35.644,
            "unit": "ms",
            "extra": "median 39.114 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 30.517,
            "unit": "ms",
            "extra": "median 32.832 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 33.361,
            "unit": "ms",
            "extra": "median 37.759 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 28.69,
            "unit": "ms",
            "extra": "median 32.112 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 38.442,
            "unit": "ms",
            "extra": "median 42.029 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 24.215,
            "unit": "ms",
            "extra": "median 28.854 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 37.529,
            "unit": "ms",
            "extra": "median 41.224 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 38.124,
            "unit": "ms",
            "extra": "median 41.859 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 34.642,
            "unit": "ms",
            "extra": "median 40.702 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 30.453,
            "unit": "ms",
            "extra": "median 35.104 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 28.116,
            "unit": "ms",
            "extra": "median 33.486 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 29.411,
            "unit": "ms",
            "extra": "median 32.933 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 29.859,
            "unit": "ms",
            "extra": "median 34.051 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 29.549,
            "unit": "ms",
            "extra": "median 35.44 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 33.634,
            "unit": "ms",
            "extra": "median 37.328 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 31.963,
            "unit": "ms",
            "extra": "median 36.184 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 29.098,
            "unit": "ms",
            "extra": "median 33.576 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.246,
            "unit": "ms",
            "extra": "median 9.052 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.805,
            "unit": "ms",
            "extra": "median 9.31 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.006,
            "unit": "ms",
            "extra": "median 1.275 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.058,
            "unit": "ms",
            "extra": "median 1.44 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.578,
            "unit": "ms",
            "extra": "median 1.156 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "b1942ab20b625d05dd0f60367113470a8fd3ffa5",
          "message": "feat(play): spend from strikes, spells and activations (#1009)\n\n* feat(rules): use buttons and optional activation cost\n\nAdd pio-use-buttons, and an optional cost and upTo on activations.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(play): pay slots, Focus Points and staff casts from the spend log\n\nSpendRequest takes optional staff, slot and focus; undoSpend refunds them.\nA spend that records a staff cast can't also expend a slot or Focus Point,\nand undoing one refunds from the log entry even if the staff is gone.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* feat(sheet): spend actions from strikes, spells and activations\n\nUse buttons send spendAction through SheetSpender and hide what the turn\ncan't pay for. Staff cast undo moves to the spend log, which shows times.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(play): take a staff cast back from the spend log after the staff is gone\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T08:44:14+10:00",
          "tree_id": "6e34b8c44b10ed763063e9ed4b2e50fcb828d975",
          "url": "https://github.com/DavidDudson/pioneer/commit/b1942ab20b625d05dd0f60367113470a8fd3ffa5"
        },
        "date": 1792190769509,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 14.799,
            "unit": "ms",
            "extra": "median 16.727 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 20.085,
            "unit": "ms",
            "extra": "median 23.345 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 14.835,
            "unit": "ms",
            "extra": "median 16.887 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 14.449,
            "unit": "ms",
            "extra": "median 16.506 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 16.982,
            "unit": "ms",
            "extra": "median 18.458 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 16.995,
            "unit": "ms",
            "extra": "median 19.24 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 16.373,
            "unit": "ms",
            "extra": "median 17.965 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 14.932,
            "unit": "ms",
            "extra": "median 17.09 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 14.654,
            "unit": "ms",
            "extra": "median 15.794 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 18.551,
            "unit": "ms",
            "extra": "median 19.881 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 17.569,
            "unit": "ms",
            "extra": "median 19.182 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 17.142,
            "unit": "ms",
            "extra": "median 18.851 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 14.002,
            "unit": "ms",
            "extra": "median 15.836 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 16.438,
            "unit": "ms",
            "extra": "median 18.125 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 15.598,
            "unit": "ms",
            "extra": "median 16.469 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 20.382,
            "unit": "ms",
            "extra": "median 23.157 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 13.534,
            "unit": "ms",
            "extra": "median 14.664 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 19.329,
            "unit": "ms",
            "extra": "median 20.993 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 19.89,
            "unit": "ms",
            "extra": "median 21.422 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 18.435,
            "unit": "ms",
            "extra": "median 19.647 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 15.19,
            "unit": "ms",
            "extra": "median 16.428 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 15.07,
            "unit": "ms",
            "extra": "median 18.38 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 14.826,
            "unit": "ms",
            "extra": "median 17.963 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 14.984,
            "unit": "ms",
            "extra": "median 15.834 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 18.3,
            "unit": "ms",
            "extra": "median 19.882 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 17.76,
            "unit": "ms",
            "extra": "median 21.203 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 19.085,
            "unit": "ms",
            "extra": "median 22.511 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 15.098,
            "unit": "ms",
            "extra": "median 19.717 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.353,
            "unit": "ms",
            "extra": "median 5.748 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.855,
            "unit": "ms",
            "extra": "median 6.105 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.592,
            "unit": "ms",
            "extra": "median 0.756 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.56,
            "unit": "ms",
            "extra": "median 0.822 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.271,
            "unit": "ms",
            "extra": "median 0.548 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "71668cffa773fe272756f4198795e4fa78d6ba28",
          "message": "feat(frontier): show and hide table columns (#1010)\n\nfr-table gets a Columns panel (fr-column-chooser) of toggle buttons and\na reset, backed by TanStack column visibility. Columns opt in with\nmeta.hideable; defaultHidden columns start hidden. [(columnVisibility)]\nholds the hidden ids (undefined means the defaults), and one column\nalways stays visible. Tables with no hideable column show no panel.\n\nCloses #948\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T09:12:52+10:00",
          "tree_id": "23b4cde22f09ea7d140581621d9cf05b469d73db",
          "url": "https://github.com/DavidDudson/pioneer/commit/71668cffa773fe272756f4198795e4fa78d6ba28"
        },
        "date": 1792192534568,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 27.205,
            "unit": "ms",
            "extra": "median 31.128 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 37.373,
            "unit": "ms",
            "extra": "median 42.524 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 27.374,
            "unit": "ms",
            "extra": "median 30.697 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.818,
            "unit": "ms",
            "extra": "median 31.467 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.625,
            "unit": "ms",
            "extra": "median 37.666 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 32.027,
            "unit": "ms",
            "extra": "median 39.127 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.651,
            "unit": "ms",
            "extra": "median 34.935 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 26.603,
            "unit": "ms",
            "extra": "median 29.59 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 27.64,
            "unit": "ms",
            "extra": "median 31.449 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 37.753,
            "unit": "ms",
            "extra": "median 41.515 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 34.656,
            "unit": "ms",
            "extra": "median 38.039 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 32.277,
            "unit": "ms",
            "extra": "median 38.608 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 26.308,
            "unit": "ms",
            "extra": "median 30.351 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 31.754,
            "unit": "ms",
            "extra": "median 37.539 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.652,
            "unit": "ms",
            "extra": "median 32.595 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 37.179,
            "unit": "ms",
            "extra": "median 41.267 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 24.164,
            "unit": "ms",
            "extra": "median 28.331 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 37.314,
            "unit": "ms",
            "extra": "median 44.461 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 37.216,
            "unit": "ms",
            "extra": "median 43.49 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 34.95,
            "unit": "ms",
            "extra": "median 39.477 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.357,
            "unit": "ms",
            "extra": "median 31.482 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 27.797,
            "unit": "ms",
            "extra": "median 33.948 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 28.51,
            "unit": "ms",
            "extra": "median 33.304 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 27.65,
            "unit": "ms",
            "extra": "median 33.291 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 29.661,
            "unit": "ms",
            "extra": "median 34.906 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 32.083,
            "unit": "ms",
            "extra": "median 38.477 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 31.899,
            "unit": "ms",
            "extra": "median 37.35 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 30.824,
            "unit": "ms",
            "extra": "median 35.294 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.417,
            "unit": "ms",
            "extra": "median 9.619 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 8.106,
            "unit": "ms",
            "extra": "median 9.727 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.935,
            "unit": "ms",
            "extra": "median 1.223 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.043,
            "unit": "ms",
            "extra": "median 1.417 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.537,
            "unit": "ms",
            "extra": "median 1.102 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "7e7372e559e1d52a75ac2e7ef237877b3c0c863f",
          "message": "feat(content): import 8 remaster adventure books from Foundry (#1012)\n\nImports Gatewalkers, Myth-Speakers, Revenge of the Runelords, Secrets of the\nUnlit Star, Troubles in Grayce, Hell's Destiny, Bastion of Blasphemies and The\nDead God's Hand at pf2e-8.6.0, each into its own pack with its backlog and the\nvocabulary it adds to core-rules. The adventure path packs take their issues\nand player's guides under one book. Registers the books, maps Foundry's\npublication titles, and lists them in NOTICE.md, the Legal page and the ORC\nattribution.\n\nEight is what the Angular build takes: with a ninth pack the compiler fails\nwith TS2859, so the rest of the batch waits on that limit.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T09:13:32+10:00",
          "tree_id": "49e6f9b246b869e03cfa432c943e7f5bba1f73ab",
          "url": "https://github.com/DavidDudson/pioneer/commit/7e7372e559e1d52a75ac2e7ef237877b3c0c863f"
        },
        "date": 1792192703771,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 31.552,
            "unit": "ms",
            "extra": "median 35.289 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 42.891,
            "unit": "ms",
            "extra": "median 46.762 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 33.919,
            "unit": "ms",
            "extra": "median 36.745 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 32.427,
            "unit": "ms",
            "extra": "median 35.05 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 36.495,
            "unit": "ms",
            "extra": "median 39.068 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 35.655,
            "unit": "ms",
            "extra": "median 38.414 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 34.648,
            "unit": "ms",
            "extra": "median 37.229 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 31.138,
            "unit": "ms",
            "extra": "median 34.308 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 32.085,
            "unit": "ms",
            "extra": "median 34.132 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 39.815,
            "unit": "ms",
            "extra": "median 42.94 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 37.119,
            "unit": "ms",
            "extra": "median 40.138 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 36.408,
            "unit": "ms",
            "extra": "median 39.181 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 27.986,
            "unit": "ms",
            "extra": "median 32.149 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 32.806,
            "unit": "ms",
            "extra": "median 37.415 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 31.792,
            "unit": "ms",
            "extra": "median 34.679 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 40.605,
            "unit": "ms",
            "extra": "median 43.137 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 28.404,
            "unit": "ms",
            "extra": "median 30.744 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 41.083,
            "unit": "ms",
            "extra": "median 43.135 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 42.184,
            "unit": "ms",
            "extra": "median 44.212 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 38.558,
            "unit": "ms",
            "extra": "median 40.723 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 31.686,
            "unit": "ms",
            "extra": "median 34.022 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 28.757,
            "unit": "ms",
            "extra": "median 32.953 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 30.449,
            "unit": "ms",
            "extra": "median 33.295 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 30.932,
            "unit": "ms",
            "extra": "median 33.966 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 32.522,
            "unit": "ms",
            "extra": "median 34.863 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 32.988,
            "unit": "ms",
            "extra": "median 36.034 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 33.807,
            "unit": "ms",
            "extra": "median 35.823 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 31.777,
            "unit": "ms",
            "extra": "median 35.289 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 8.159,
            "unit": "ms",
            "extra": "median 10.117 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 8.299,
            "unit": "ms",
            "extra": "median 9.899 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.113,
            "unit": "ms",
            "extra": "median 1.448 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.129,
            "unit": "ms",
            "extra": "median 1.516 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.568,
            "unit": "ms",
            "extra": "median 1.05 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "f9a824a492b309f02610ca1fd34eea7312f559f7",
          "message": "feat(play): raise a shield, shield block and shield damage (#1011)\n\n* feat(play): raise a shield, shield block and shield damage\n\nAdd Raise a Shield and Shield Block commands, shield damage and hardness handling to play state, the play service and the encounter tab shield UI.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs(play): document shields, Shield Block and shield damage\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T09:32:02+10:00",
          "tree_id": "f9fe1fd6edcab062c8df58a8ded229d41fedadc0",
          "url": "https://github.com/DavidDudson/pioneer/commit/f9a824a492b309f02610ca1fd34eea7312f559f7"
        },
        "date": 1792193674773,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 26.947,
            "unit": "ms",
            "extra": "median 29.606 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 38.333,
            "unit": "ms",
            "extra": "median 40.942 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 27.617,
            "unit": "ms",
            "extra": "median 29.305 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 25.973,
            "unit": "ms",
            "extra": "median 27.162 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 30.702,
            "unit": "ms",
            "extra": "median 32.153 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 31.555,
            "unit": "ms",
            "extra": "median 33.437 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.618,
            "unit": "ms",
            "extra": "median 32.177 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 26.987,
            "unit": "ms",
            "extra": "median 28.438 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 26.872,
            "unit": "ms",
            "extra": "median 28.382 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 34.557,
            "unit": "ms",
            "extra": "median 36.775 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 32.76,
            "unit": "ms",
            "extra": "median 34.825 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 32.107,
            "unit": "ms",
            "extra": "median 34.01 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 25.707,
            "unit": "ms",
            "extra": "median 27.165 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 29.484,
            "unit": "ms",
            "extra": "median 31.408 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.157,
            "unit": "ms",
            "extra": "median 29.119 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 35.471,
            "unit": "ms",
            "extra": "median 37.708 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 24.266,
            "unit": "ms",
            "extra": "median 25.668 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 35.65,
            "unit": "ms",
            "extra": "median 38.105 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 36.224,
            "unit": "ms",
            "extra": "median 38.946 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 32.988,
            "unit": "ms",
            "extra": "median 35.707 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.206,
            "unit": "ms",
            "extra": "median 29.097 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 26.873,
            "unit": "ms",
            "extra": "median 28.896 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 26.483,
            "unit": "ms",
            "extra": "median 28.06 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 26.792,
            "unit": "ms",
            "extra": "median 28.122 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 27.933,
            "unit": "ms",
            "extra": "median 30.012 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 28.356,
            "unit": "ms",
            "extra": "median 30.037 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 28.186,
            "unit": "ms",
            "extra": "median 30.286 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 27.316,
            "unit": "ms",
            "extra": "median 29.222 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.78,
            "unit": "ms",
            "extra": "median 8.836 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.194,
            "unit": "ms",
            "extra": "median 8.89 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.805,
            "unit": "ms",
            "extra": "median 0.964 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.974,
            "unit": "ms",
            "extra": "median 1.176 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.545,
            "unit": "ms",
            "extra": "median 1.068 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "00517706d6facffe0dac1b98ef457b334dd2f9d2",
          "message": "feat(interop): compare Pathbuilder focus spells and the focus pool (#1031)\n\nThe import now picks the open feature choice that gives a focus spell the\nexport lists (a mystery, a devotion spell), reports the listed focus\nspells the character still lacks with the spell gaps, and compares the\nfocus pool with Pathbuilder's focusPoints. The pick search shares its\nhelpers with the innate casters.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:20:30+10:00",
          "tree_id": "028d4732c2020ed35a90fb7a2418519a00359bfb",
          "url": "https://github.com/DavidDudson/pioneer/commit/00517706d6facffe0dac1b98ef457b334dd2f9d2"
        },
        "date": 1792232968905,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 28.625,
            "unit": "ms",
            "extra": "median 32.951 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 38.919,
            "unit": "ms",
            "extra": "median 44.006 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 28.309,
            "unit": "ms",
            "extra": "median 30.931 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.223,
            "unit": "ms",
            "extra": "median 27.909 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.868,
            "unit": "ms",
            "extra": "median 35.54 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 31.222,
            "unit": "ms",
            "extra": "median 33.559 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.617,
            "unit": "ms",
            "extra": "median 33.034 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 27.454,
            "unit": "ms",
            "extra": "median 29.382 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 27.854,
            "unit": "ms",
            "extra": "median 30.056 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 35.237,
            "unit": "ms",
            "extra": "median 39.456 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 33.576,
            "unit": "ms",
            "extra": "median 36.363 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 36.065,
            "unit": "ms",
            "extra": "median 40.037 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 26.753,
            "unit": "ms",
            "extra": "median 30.344 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 30.484,
            "unit": "ms",
            "extra": "median 32.634 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.805,
            "unit": "ms",
            "extra": "median 29.965 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 37.422,
            "unit": "ms",
            "extra": "median 40.697 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 24.508,
            "unit": "ms",
            "extra": "median 26.673 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 37.06,
            "unit": "ms",
            "extra": "median 39.785 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 37.393,
            "unit": "ms",
            "extra": "median 39.505 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 33.305,
            "unit": "ms",
            "extra": "median 35.034 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.393,
            "unit": "ms",
            "extra": "median 28.945 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 26.948,
            "unit": "ms",
            "extra": "median 28.463 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 26.853,
            "unit": "ms",
            "extra": "median 28.246 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 27.447,
            "unit": "ms",
            "extra": "median 28.893 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 28.796,
            "unit": "ms",
            "extra": "median 30.353 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 29.289,
            "unit": "ms",
            "extra": "median 30.973 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 28.518,
            "unit": "ms",
            "extra": "median 30.904 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 27.767,
            "unit": "ms",
            "extra": "median 29.231 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.1,
            "unit": "ms",
            "extra": "median 9.053 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.836,
            "unit": "ms",
            "extra": "median 9.308 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.876,
            "unit": "ms",
            "extra": "median 1.022 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.934,
            "unit": "ms",
            "extra": "median 1.184 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.542,
            "unit": "ms",
            "extra": "median 1.066 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "b93d9440f60c6c1a60231cd837942ebe552060b5",
          "message": "feat(play): MAP follows attacks made (#1026)\n\nCount attacks in turn state so each Strike marks the step of the\nmultiple attack penalty its next attack takes. A spend flagged\n`attack` counts one on a running turn and undoSpend takes it back;\n`setAttacks` sets the count by hand. Start and End turn clear it.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:25:09+10:00",
          "tree_id": "bfe49c275d18245bc36f7df3c1c90d1ba438ef72",
          "url": "https://github.com/DavidDudson/pioneer/commit/b93d9440f60c6c1a60231cd837942ebe552060b5"
        },
        "date": 1792233251846,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 33.736,
            "unit": "ms",
            "extra": "median 37.499 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 45.294,
            "unit": "ms",
            "extra": "median 50.921 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 33.963,
            "unit": "ms",
            "extra": "median 37.465 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 32.317,
            "unit": "ms",
            "extra": "median 34.53 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 38.246,
            "unit": "ms",
            "extra": "median 40.838 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 37.232,
            "unit": "ms",
            "extra": "median 39.973 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 35.742,
            "unit": "ms",
            "extra": "median 40.179 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 32.315,
            "unit": "ms",
            "extra": "median 35.248 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 32.226,
            "unit": "ms",
            "extra": "median 35.425 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 41.661,
            "unit": "ms",
            "extra": "median 44.219 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 40.062,
            "unit": "ms",
            "extra": "median 42.936 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 38.763,
            "unit": "ms",
            "extra": "median 41.717 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 32.119,
            "unit": "ms",
            "extra": "median 34.97 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 37.07,
            "unit": "ms",
            "extra": "median 40.179 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 32.767,
            "unit": "ms",
            "extra": "median 36.404 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 42.801,
            "unit": "ms",
            "extra": "median 45.501 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 30.35,
            "unit": "ms",
            "extra": "median 32.97 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 43.03,
            "unit": "ms",
            "extra": "median 45.879 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 44.225,
            "unit": "ms",
            "extra": "median 46.597 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 41.035,
            "unit": "ms",
            "extra": "median 42.808 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 33.974,
            "unit": "ms",
            "extra": "median 36.523 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 32.199,
            "unit": "ms",
            "extra": "median 36.323 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 33.813,
            "unit": "ms",
            "extra": "median 36.427 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 32.533,
            "unit": "ms",
            "extra": "median 35.875 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 33.131,
            "unit": "ms",
            "extra": "median 36.975 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 35.058,
            "unit": "ms",
            "extra": "median 38.106 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 33.548,
            "unit": "ms",
            "extra": "median 36.223 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 32.973,
            "unit": "ms",
            "extra": "median 35.873 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.544,
            "unit": "ms",
            "extra": "median 9.763 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 8.091,
            "unit": "ms",
            "extra": "median 9.405 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.88,
            "unit": "ms",
            "extra": "median 1.411 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.108,
            "unit": "ms",
            "extra": "median 1.486 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.77,
            "unit": "ms",
            "extra": "median 1.248 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "b6b365a6c8573f55548b76c4a9fea1ca569b7667",
          "message": "feat(campaign): GM sets table limits on the campaign rules screen (#1035)\n\nA GM can set the four inventory limits (invested, hands, property runes\nper grade, lines) for a campaign. Characters attached to it are held to\nthem, read from GET /characters/:id/rule-limits, and the sheet flags\nrule breaks against them.\n\nA campaign can lower a limit and its characters are held to it. A raise\npast the core number only stops the flags on imported lines: in-app\nedits are clamped to core by storableLimits, because the schema stores\nplayer lines up to the core numbers only (ADR-0064).\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:29:48+10:00",
          "tree_id": "db091b2cab9211e90118adfd75cdb6cc5d60517b",
          "url": "https://github.com/DavidDudson/pioneer/commit/b6b365a6c8573f55548b76c4a9fea1ca569b7667"
        },
        "date": 1792233395312,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 23.162,
            "unit": "ms",
            "extra": "median 27.214 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 29.927,
            "unit": "ms",
            "extra": "median 34.779 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 23.429,
            "unit": "ms",
            "extra": "median 27.249 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 19.699,
            "unit": "ms",
            "extra": "median 24.761 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 26.189,
            "unit": "ms",
            "extra": "median 29.183 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 27.12,
            "unit": "ms",
            "extra": "median 30.565 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 28.332,
            "unit": "ms",
            "extra": "median 29.58 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 24.639,
            "unit": "ms",
            "extra": "median 27.53 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.255,
            "unit": "ms",
            "extra": "median 26.326 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 28.853,
            "unit": "ms",
            "extra": "median 32.944 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 28.346,
            "unit": "ms",
            "extra": "median 30.983 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 28.394,
            "unit": "ms",
            "extra": "median 31.631 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 21.306,
            "unit": "ms",
            "extra": "median 24.619 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 26.403,
            "unit": "ms",
            "extra": "median 30.281 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.661,
            "unit": "ms",
            "extra": "median 27.023 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 29.234,
            "unit": "ms",
            "extra": "median 34.691 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 20.498,
            "unit": "ms",
            "extra": "median 25.147 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 32.162,
            "unit": "ms",
            "extra": "median 35.491 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 30.378,
            "unit": "ms",
            "extra": "median 34.454 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 29.819,
            "unit": "ms",
            "extra": "median 32.365 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 25.231,
            "unit": "ms",
            "extra": "median 28.475 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 22.916,
            "unit": "ms",
            "extra": "median 27.49 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 24.734,
            "unit": "ms",
            "extra": "median 27.649 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 25.215,
            "unit": "ms",
            "extra": "median 28.01 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 24.828,
            "unit": "ms",
            "extra": "median 28.555 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 26.662,
            "unit": "ms",
            "extra": "median 29.312 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 26.012,
            "unit": "ms",
            "extra": "median 28.638 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 24.29,
            "unit": "ms",
            "extra": "median 28.536 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.477,
            "unit": "ms",
            "extra": "median 7.155 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.788,
            "unit": "ms",
            "extra": "median 6.614 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.761,
            "unit": "ms",
            "extra": "median 0.988 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.645,
            "unit": "ms",
            "extra": "median 0.919 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.318,
            "unit": "ms",
            "extra": "median 0.643 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "5c051fea2016606cd6faad5dd5c8c6e5f06f2f39",
          "message": "feat(frontier): fr-filter-bar with filter chips (#1033)\n\nfr-filter-bar narrows a list with editable chips. Add filter opens an\ninline panel (no popover): pick a field, then an operator (is, is not,\nis any of, between), then values; set and flag values are chips with\noptional counts, ranges are one or two number boxes. A chip reopens the\npanel on its filter, its cross removes it, Clear all removes every one.\n\nThe content feature maps the facet engine's FilterState to and from the\nbar's value (filterConditions, filterState, filterFields), with a\nfast-check property that a state round-trips through chips.\n\nCloses #947\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:35:20+10:00",
          "tree_id": "77bf181759afd5ba751175b634b57fc238c2b1e3",
          "url": "https://github.com/DavidDudson/pioneer/commit/5c051fea2016606cd6faad5dd5c8c6e5f06f2f39"
        },
        "date": 1792233515300,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 16.098,
            "unit": "ms",
            "extra": "median 22.1 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 23.688,
            "unit": "ms",
            "extra": "median 30.165 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 15.756,
            "unit": "ms",
            "extra": "median 19.233 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 15.373,
            "unit": "ms",
            "extra": "median 19.273 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 18.22,
            "unit": "ms",
            "extra": "median 20.734 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 17.783,
            "unit": "ms",
            "extra": "median 20.746 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 17.415,
            "unit": "ms",
            "extra": "median 20.719 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 15.503,
            "unit": "ms",
            "extra": "median 17.966 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 16.107,
            "unit": "ms",
            "extra": "median 20.112 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 20.012,
            "unit": "ms",
            "extra": "median 23.388 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 19.724,
            "unit": "ms",
            "extra": "median 22.007 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 19.077,
            "unit": "ms",
            "extra": "median 22.1 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 15.216,
            "unit": "ms",
            "extra": "median 17.596 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 17.082,
            "unit": "ms",
            "extra": "median 19.425 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 16,
            "unit": "ms",
            "extra": "median 17.959 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 23.744,
            "unit": "ms",
            "extra": "median 28.229 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 14.665,
            "unit": "ms",
            "extra": "median 16.266 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 21.799,
            "unit": "ms",
            "extra": "median 25.559 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 22.238,
            "unit": "ms",
            "extra": "median 24.786 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 20.197,
            "unit": "ms",
            "extra": "median 22.017 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 16.353,
            "unit": "ms",
            "extra": "median 18.115 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 16.407,
            "unit": "ms",
            "extra": "median 18.616 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 15.969,
            "unit": "ms",
            "extra": "median 17.654 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 16.424,
            "unit": "ms",
            "extra": "median 18.805 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 17.497,
            "unit": "ms",
            "extra": "median 18.944 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 17.086,
            "unit": "ms",
            "extra": "median 18.369 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 17.27,
            "unit": "ms",
            "extra": "median 19.775 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 16.903,
            "unit": "ms",
            "extra": "median 19.628 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.307,
            "unit": "ms",
            "extra": "median 5.738 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.856,
            "unit": "ms",
            "extra": "median 5.893 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.515,
            "unit": "ms",
            "extra": "median 0.644 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.542,
            "unit": "ms",
            "extra": "median 0.646 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.464,
            "unit": "ms",
            "extra": "median 0.613 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "e036d53a6e2c70464398fcd468b98a80f4d2af60",
          "message": "fix(sheet): keep sheet-spells under the dependency limit (#1037)\n\nThe innate spells line pushed sheet-spells.component.ts to 21 imports\n(max 20), failing lint on main. sheetInnate sits beside sheetFocus, its\ntwin, in one module.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:43:12+10:00",
          "tree_id": "f3faf9d44893079490d8a9d5e11c4794bbfece97",
          "url": "https://github.com/DavidDudson/pioneer/commit/e036d53a6e2c70464398fcd468b98a80f4d2af60"
        },
        "date": 1792233952567,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 21.65,
            "unit": "ms",
            "extra": "median 27.347 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 31.116,
            "unit": "ms",
            "extra": "median 36.971 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 23.075,
            "unit": "ms",
            "extra": "median 27.557 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 20.87,
            "unit": "ms",
            "extra": "median 26.138 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 25.119,
            "unit": "ms",
            "extra": "median 29.538 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 25.361,
            "unit": "ms",
            "extra": "median 28.858 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 24.676,
            "unit": "ms",
            "extra": "median 27.578 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.738,
            "unit": "ms",
            "extra": "median 25.975 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 22.138,
            "unit": "ms",
            "extra": "median 25.935 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 28.001,
            "unit": "ms",
            "extra": "median 33.277 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 27.132,
            "unit": "ms",
            "extra": "median 31.281 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 26.917,
            "unit": "ms",
            "extra": "median 29.826 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.886,
            "unit": "ms",
            "extra": "median 23.401 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 24.308,
            "unit": "ms",
            "extra": "median 27.512 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.555,
            "unit": "ms",
            "extra": "median 27.191 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 29.14,
            "unit": "ms",
            "extra": "median 33.433 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 20.192,
            "unit": "ms",
            "extra": "median 21.372 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.732,
            "unit": "ms",
            "extra": "median 36.394 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 31.491,
            "unit": "ms",
            "extra": "median 37.607 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 26.941,
            "unit": "ms",
            "extra": "median 32.583 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 22.687,
            "unit": "ms",
            "extra": "median 26.355 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 22.224,
            "unit": "ms",
            "extra": "median 24.304 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 21.923,
            "unit": "ms",
            "extra": "median 28.031 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 23.358,
            "unit": "ms",
            "extra": "median 29.669 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 24.37,
            "unit": "ms",
            "extra": "median 27.374 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 23.587,
            "unit": "ms",
            "extra": "median 25.705 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 24.05,
            "unit": "ms",
            "extra": "median 28.946 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 23.048,
            "unit": "ms",
            "extra": "median 24.754 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.951,
            "unit": "ms",
            "extra": "median 7.428 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.076,
            "unit": "ms",
            "extra": "median 6.773 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.648,
            "unit": "ms",
            "extra": "median 0.825 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.763,
            "unit": "ms",
            "extra": "median 0.916 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.398,
            "unit": "ms",
            "extra": "median 0.763 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "66fda103112137673877eb07471ee6f2487ccea8",
          "message": "fix(catalog): load pack JSON from plain JS so the compiler never infers it (#1036)\n\nThe compiler inferred a type for every pack JSON file the catalog imported\n(2.0M types, 4.4 GB, 58 s on legal-feature) and hit TS2859 at the ninth pack.\nThe loaders are now *-packs.js with a .d.ts beside each, so tsc never reads the\nimports (112K types, 0.4 GB, 1.2 s). Bun and the Angular bundler read the .js\nas before. The importer registers packs in the .js files.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:43:21+10:00",
          "tree_id": "79780885afd78ba1db7d278865a3c00cce00b6d0",
          "url": "https://github.com/DavidDudson/pioneer/commit/66fda103112137673877eb07471ee6f2487ccea8"
        },
        "date": 1792234181831,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 31.274,
            "unit": "ms",
            "extra": "median 37.604 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 41.097,
            "unit": "ms",
            "extra": "median 44.643 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 29.479,
            "unit": "ms",
            "extra": "median 32.086 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 27.459,
            "unit": "ms",
            "extra": "median 30.094 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 32.976,
            "unit": "ms",
            "extra": "median 36.502 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 33.448,
            "unit": "ms",
            "extra": "median 35.915 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 32.817,
            "unit": "ms",
            "extra": "median 36.058 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 29.207,
            "unit": "ms",
            "extra": "median 33.149 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 28.755,
            "unit": "ms",
            "extra": "median 30.822 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 37.357,
            "unit": "ms",
            "extra": "median 40.643 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 34.961,
            "unit": "ms",
            "extra": "median 38.183 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 34.282,
            "unit": "ms",
            "extra": "median 37.824 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 27.352,
            "unit": "ms",
            "extra": "median 29.654 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 31.69,
            "unit": "ms",
            "extra": "median 35.14 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 28.613,
            "unit": "ms",
            "extra": "median 31.425 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 37.778,
            "unit": "ms",
            "extra": "median 41.536 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 25.486,
            "unit": "ms",
            "extra": "median 28.113 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 38.796,
            "unit": "ms",
            "extra": "median 44.583 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 39.607,
            "unit": "ms",
            "extra": "median 43.603 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 36.017,
            "unit": "ms",
            "extra": "median 38.961 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 29.57,
            "unit": "ms",
            "extra": "median 32.845 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 29.455,
            "unit": "ms",
            "extra": "median 31.948 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 28.382,
            "unit": "ms",
            "extra": "median 31.619 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 28.667,
            "unit": "ms",
            "extra": "median 31.968 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 29.963,
            "unit": "ms",
            "extra": "median 33.391 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 30.538,
            "unit": "ms",
            "extra": "median 33.355 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 30.636,
            "unit": "ms",
            "extra": "median 36.427 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 29.662,
            "unit": "ms",
            "extra": "median 33.516 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.166,
            "unit": "ms",
            "extra": "median 9.061 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.666,
            "unit": "ms",
            "extra": "median 9.07 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.882,
            "unit": "ms",
            "extra": "median 1.074 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.085,
            "unit": "ms",
            "extra": "median 1.358 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.527,
            "unit": "ms",
            "extra": "median 1.129 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "61393980e5d349560596851eaa4a4d5fe03ef2a8",
          "message": "chore(ci): make main green and stop dropping main runs (#995)\n\n* fix(character): drop dead wand check, unused exports and a bad undefined\n\nplay-wand.ts duplicated the wand cast check play-service.ts already holds\n(#914), so nothing imported it and knip failed lint:workspace. The other\nflagged exports are only used in their own file. Spell DCs read\ninputs.spellcasting, which is optional, so default it to none.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test: fix type errors and stale expectations in main's tests\n\ntypecheck went to bun --check (#871), which checks test files, and tests\nhad gathered literals where brands are required. Also: the Pathbuilder\ngolden reports Mordred's divine focus DC under champion-focus now that\nchampions have an entry, Combat Chaplain trains Religion, and the\nplayground statistics specs load a pack and need more than 5s.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* ci: finish every main run, give Angular jobs heap, fix typos and docs\n\nA concurrency group holds one pending run, so each merge cancelled the\nqueued main run of the one before. Push runs now group per commit. Jobs\nthat compile Angular set --max-old-space-size after ERR_WORKER_OUT_OF_MEMORY\nand ngc heap exhaustion, and get more time. Foundry's own misspellings in\nthe new packs are allowed, and one long docs line is wrapped.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* docs: format the ADR index\n\noxfmt realigned the table after a wider row landed.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(character): checkExploration takes any play edit, tests pass lint\n\nplay-service.ts passes a PlayEdit, which includes turn commands, to\ncheckExploration (#990), whose parameter was a PlayCommand. The tests added\nfor it and for the brands above also trip max-nested-calls and max-lines.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix(character): make initiative spec and content db test pass lint\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* fix: green main after rebase onto the spell-slot and spend work\n\nMain's spell slot comparison fed statistic inputs to a function that\nreads spellcasting in play; its new tests had unbranded literals; the\nCommander's tactic choices have no tactics to pick yet.\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* ci: format payments test, time seeding tests, relax PR bench alerts\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n* test: type the new tests so typecheck passes\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:47:21+10:00",
          "tree_id": "2258579190e00f0eae20665e659f195e29b86288",
          "url": "https://github.com/DavidDudson/pioneer/commit/61393980e5d349560596851eaa4a4d5fe03ef2a8"
        },
        "date": 1792234273821,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 21.477,
            "unit": "ms",
            "extra": "median 24.018 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 30.153,
            "unit": "ms",
            "extra": "median 32.509 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 22.293,
            "unit": "ms",
            "extra": "median 24.5 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 20.822,
            "unit": "ms",
            "extra": "median 22.327 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 24.943,
            "unit": "ms",
            "extra": "median 26.433 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 25.342,
            "unit": "ms",
            "extra": "median 26.895 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 24.692,
            "unit": "ms",
            "extra": "median 26.562 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 21.713,
            "unit": "ms",
            "extra": "median 23.181 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 21.984,
            "unit": "ms",
            "extra": "median 23.165 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 28.855,
            "unit": "ms",
            "extra": "median 30.544 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 26.224,
            "unit": "ms",
            "extra": "median 28.114 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 25.834,
            "unit": "ms",
            "extra": "median 27.273 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 20.787,
            "unit": "ms",
            "extra": "median 22.17 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 23.911,
            "unit": "ms",
            "extra": "median 25.568 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 21.874,
            "unit": "ms",
            "extra": "median 23.58 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 28.895,
            "unit": "ms",
            "extra": "median 30.956 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 19.821,
            "unit": "ms",
            "extra": "median 21.238 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 29.112,
            "unit": "ms",
            "extra": "median 30.993 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 29.875,
            "unit": "ms",
            "extra": "median 31.745 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 26.686,
            "unit": "ms",
            "extra": "median 28.519 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 22.347,
            "unit": "ms",
            "extra": "median 23.493 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 22.014,
            "unit": "ms",
            "extra": "median 23.138 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 21.899,
            "unit": "ms",
            "extra": "median 23.059 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 22.19,
            "unit": "ms",
            "extra": "median 23.218 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 23.451,
            "unit": "ms",
            "extra": "median 24.339 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 23.691,
            "unit": "ms",
            "extra": "median 24.661 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 23.43,
            "unit": "ms",
            "extra": "median 24.524 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 22.739,
            "unit": "ms",
            "extra": "median 23.597 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 5.615,
            "unit": "ms",
            "extra": "median 7.457 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.899,
            "unit": "ms",
            "extra": "median 7.279 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.684,
            "unit": "ms",
            "extra": "median 0.855 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.728,
            "unit": "ms",
            "extra": "median 0.899 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.377,
            "unit": "ms",
            "extra": "median 0.775 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "4ace8880a671597f69f16e157eb39d35f0c86e7b",
          "message": "feat(frontier): table view codec (#1038)\n\nPure encodeTableView/decodeTableView in @pioneer/frontier/data. Columns\ndeclare a short code; defaults are omitted; malformed params are dropped.\nThe facet segment (f) is an opaque string the page's facet codec fills,\nsince frontier cannot import rules/sdk.\n\nRefs #949\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:50:16+10:00",
          "tree_id": "5a00c3efb8b7ff9683899fd51f25b8bcb115c53b",
          "url": "https://github.com/DavidDudson/pioneer/commit/4ace8880a671597f69f16e157eb39d35f0c86e7b"
        },
        "date": 1792234711188,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 16.512,
            "unit": "ms",
            "extra": "median 19.998 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 23.697,
            "unit": "ms",
            "extra": "median 26.628 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 16.402,
            "unit": "ms",
            "extra": "median 19.715 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 14.998,
            "unit": "ms",
            "extra": "median 16.821 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 18.166,
            "unit": "ms",
            "extra": "median 20.834 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 18.809,
            "unit": "ms",
            "extra": "median 22.237 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 17.994,
            "unit": "ms",
            "extra": "median 21.066 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 15.886,
            "unit": "ms",
            "extra": "median 18.575 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 16.371,
            "unit": "ms",
            "extra": "median 19.287 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 20.667,
            "unit": "ms",
            "extra": "median 23.26 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 20.708,
            "unit": "ms",
            "extra": "median 26.193 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 19.623,
            "unit": "ms",
            "extra": "median 22.919 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 15.651,
            "unit": "ms",
            "extra": "median 19.139 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 18.02,
            "unit": "ms",
            "extra": "median 20.348 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 16.573,
            "unit": "ms",
            "extra": "median 20.393 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 22.031,
            "unit": "ms",
            "extra": "median 26.633 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 14.669,
            "unit": "ms",
            "extra": "median 16.922 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 22.281,
            "unit": "ms",
            "extra": "median 27.478 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 21.922,
            "unit": "ms",
            "extra": "median 25.089 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 21.282,
            "unit": "ms",
            "extra": "median 26.905 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 16.804,
            "unit": "ms",
            "extra": "median 19.733 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 16.722,
            "unit": "ms",
            "extra": "median 20.39 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 17.665,
            "unit": "ms",
            "extra": "median 21.419 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 17.134,
            "unit": "ms",
            "extra": "median 20.384 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 17.877,
            "unit": "ms",
            "extra": "median 21.217 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 18.458,
            "unit": "ms",
            "extra": "median 22.029 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 18.423,
            "unit": "ms",
            "extra": "median 22.874 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 17.541,
            "unit": "ms",
            "extra": "median 20.491 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.826,
            "unit": "ms",
            "extra": "median 6.3 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 5.346,
            "unit": "ms",
            "extra": "median 5.933 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.698,
            "unit": "ms",
            "extra": "median 0.868 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.587,
            "unit": "ms",
            "extra": "median 0.816 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.317,
            "unit": "ms",
            "extra": "median 0.688 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "9bf6b6e75b1634b479818a7b6a9ae2b953709a7f",
          "message": "feat(sheet): a character outside a campaign sets its own table limits (#1040)\n\nA character outside a campaign sets the four inventory limits for itself\non the Plan tab, next to its variant rules. In a campaign it is held to\nthe campaign's limits and cannot change them (409); detaching brings its\nown back untouched.\n\n- character_rule_limits table (migration 0035) mirroring the campaign's\n- GET/POST/DELETE /characters/:id/rule-limit-settings[/:limit], owner only\n- CharacterRuleLimitService replaces CharacterRuleLimits: campaign's\n  numbers, else the owner's, else the core rules'\n- Table limits panel on the sheet's Plan tab\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:50:51+10:00",
          "tree_id": "75afa74f313796656fa680c85778d5af0b54d32d",
          "url": "https://github.com/DavidDudson/pioneer/commit/9bf6b6e75b1634b479818a7b6a9ae2b953709a7f"
        },
        "date": 1792234864699,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 27.542,
            "unit": "ms",
            "extra": "median 31.264 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 38.512,
            "unit": "ms",
            "extra": "median 41.521 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 28.305,
            "unit": "ms",
            "extra": "median 30.991 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.94,
            "unit": "ms",
            "extra": "median 30.32 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.607,
            "unit": "ms",
            "extra": "median 35.833 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 31.943,
            "unit": "ms",
            "extra": "median 35.154 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.73,
            "unit": "ms",
            "extra": "median 33.873 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 26.871,
            "unit": "ms",
            "extra": "median 29.745 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 27.087,
            "unit": "ms",
            "extra": "median 30.331 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 35.423,
            "unit": "ms",
            "extra": "median 38.188 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 33.633,
            "unit": "ms",
            "extra": "median 36.484 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 32.498,
            "unit": "ms",
            "extra": "median 35.846 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 26.38,
            "unit": "ms",
            "extra": "median 28.571 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 30.095,
            "unit": "ms",
            "extra": "median 33.031 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.94,
            "unit": "ms",
            "extra": "median 30.475 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 36.556,
            "unit": "ms",
            "extra": "median 40.23 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 24.486,
            "unit": "ms",
            "extra": "median 27.099 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 36.154,
            "unit": "ms",
            "extra": "median 39.246 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 38.088,
            "unit": "ms",
            "extra": "median 41.266 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 34.285,
            "unit": "ms",
            "extra": "median 36.662 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.98,
            "unit": "ms",
            "extra": "median 31.838 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 27.317,
            "unit": "ms",
            "extra": "median 29.399 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 26.875,
            "unit": "ms",
            "extra": "median 29.749 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 27.574,
            "unit": "ms",
            "extra": "median 29.539 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 29.34,
            "unit": "ms",
            "extra": "median 31.74 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 29.561,
            "unit": "ms",
            "extra": "median 32.15 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 28.91,
            "unit": "ms",
            "extra": "median 32.021 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 27.739,
            "unit": "ms",
            "extra": "median 30.583 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.165,
            "unit": "ms",
            "extra": "median 9.142 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.688,
            "unit": "ms",
            "extra": "median 8.679 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.831,
            "unit": "ms",
            "extra": "median 0.985 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.987,
            "unit": "ms",
            "extra": "median 1.16 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.54,
            "unit": "ms",
            "extra": "median 1.079 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "4e72dc527513bc6301fe9e2a58298f77db24f23a",
          "message": "feat(rules): BattleForm rule element schema and translator (#1044)\n\nAdd a typed BattleForm element to the Creature group of the rules sdk:\nbase form statistics, heightened brackets by spell rank, and the form's\nflags. The Foundry translator turns overrides and brackets into it and\nlists name-keyed records, so 51 of 90 backlog elements now translate.\nElements that depend on a pick or an @item formula stay in the backlog.\n\nPart of the Battle form engine epic.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T20:51:13+10:00",
          "tree_id": "61d2729e9edf7c7f32bc26dad3b9010021af13e5",
          "url": "https://github.com/DavidDudson/pioneer/commit/4e72dc527513bc6301fe9e2a58298f77db24f23a"
        },
        "date": 1792234904800,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 28.205,
            "unit": "ms",
            "extra": "median 31.24 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 38.897,
            "unit": "ms",
            "extra": "median 41.486 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 28.066,
            "unit": "ms",
            "extra": "median 30.136 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 25.639,
            "unit": "ms",
            "extra": "median 27.73 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 31.16,
            "unit": "ms",
            "extra": "median 33.266 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 31.314,
            "unit": "ms",
            "extra": "median 33.738 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 30.794,
            "unit": "ms",
            "extra": "median 32.703 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 27.075,
            "unit": "ms",
            "extra": "median 29.067 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 27.227,
            "unit": "ms",
            "extra": "median 28.905 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 35.26,
            "unit": "ms",
            "extra": "median 37.511 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 33.099,
            "unit": "ms",
            "extra": "median 36.256 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 32.123,
            "unit": "ms",
            "extra": "median 35.367 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 25.9,
            "unit": "ms",
            "extra": "median 27.666 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 29.825,
            "unit": "ms",
            "extra": "median 32.052 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 27.341,
            "unit": "ms",
            "extra": "median 29.319 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 36.071,
            "unit": "ms",
            "extra": "median 39.024 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 24.643,
            "unit": "ms",
            "extra": "median 26.082 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 36.506,
            "unit": "ms",
            "extra": "median 39.108 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 36.632,
            "unit": "ms",
            "extra": "median 40.629 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 33.262,
            "unit": "ms",
            "extra": "median 35.609 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 27.278,
            "unit": "ms",
            "extra": "median 29.053 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 27.161,
            "unit": "ms",
            "extra": "median 29.134 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 26.991,
            "unit": "ms",
            "extra": "median 28.887 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 27.514,
            "unit": "ms",
            "extra": "median 29.63 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 28.833,
            "unit": "ms",
            "extra": "median 30.572 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 29.132,
            "unit": "ms",
            "extra": "median 30.751 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 28.952,
            "unit": "ms",
            "extra": "median 30.888 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 27.874,
            "unit": "ms",
            "extra": "median 29.813 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.875,
            "unit": "ms",
            "extra": "median 8.192 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.256,
            "unit": "ms",
            "extra": "median 8.635 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.866,
            "unit": "ms",
            "extra": "median 1.043 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.029,
            "unit": "ms",
            "extra": "median 1.19 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.535,
            "unit": "ms",
            "extra": "median 1.076 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "849fa89ca40fda15c09c1844290b6a013fb82d54",
          "message": "docs(frontier): table view key scheme (#1045)\n\nADR-0068 fixes the query keys (s, f, c, n, q), column codes, omitted\ndefaults and drop-not-fail reading. frontier AGENTS.md documents the\ncodec and injectTableView.\n\nCloses #949\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:01:59+10:00",
          "tree_id": "608c3e00039d0cd36626eabc9319e9e799d90a3b",
          "url": "https://github.com/DavidDudson/pioneer/commit/849fa89ca40fda15c09c1844290b6a013fb82d54"
        },
        "date": 1792235065164,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 16.487,
            "unit": "ms",
            "extra": "median 19.608 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 22.478,
            "unit": "ms",
            "extra": "median 26.599 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 17.233,
            "unit": "ms",
            "extra": "median 19.937 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 15.498,
            "unit": "ms",
            "extra": "median 17.316 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 18.654,
            "unit": "ms",
            "extra": "median 21.086 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 18.738,
            "unit": "ms",
            "extra": "median 21.319 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 18.201,
            "unit": "ms",
            "extra": "median 21.895 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 16.267,
            "unit": "ms",
            "extra": "median 18.818 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 15.931,
            "unit": "ms",
            "extra": "median 18.5 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 20.36,
            "unit": "ms",
            "extra": "median 23.102 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 19.401,
            "unit": "ms",
            "extra": "median 21.749 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 20.942,
            "unit": "ms",
            "extra": "median 25.152 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 16.049,
            "unit": "ms",
            "extra": "median 18.364 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 18.595,
            "unit": "ms",
            "extra": "median 22.847 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 17.972,
            "unit": "ms",
            "extra": "median 20.968 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 22.858,
            "unit": "ms",
            "extra": "median 25.978 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 15.075,
            "unit": "ms",
            "extra": "median 18.16 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 25.715,
            "unit": "ms",
            "extra": "median 29.602 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 27.42,
            "unit": "ms",
            "extra": "median 30.438 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 22.456,
            "unit": "ms",
            "extra": "median 26.921 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 17.309,
            "unit": "ms",
            "extra": "median 20.23 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 17.119,
            "unit": "ms",
            "extra": "median 21.572 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 17.21,
            "unit": "ms",
            "extra": "median 20.176 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 19.052,
            "unit": "ms",
            "extra": "median 23.069 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 16.919,
            "unit": "ms",
            "extra": "median 18.36 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 16.767,
            "unit": "ms",
            "extra": "median 19.037 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 17.085,
            "unit": "ms",
            "extra": "median 18.232 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 16.564,
            "unit": "ms",
            "extra": "median 18.518 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.323,
            "unit": "ms",
            "extra": "median 5.57 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.884,
            "unit": "ms",
            "extra": "median 6.047 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.481,
            "unit": "ms",
            "extra": "median 0.635 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.509,
            "unit": "ms",
            "extra": "median 0.632 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.349,
            "unit": "ms",
            "extra": "median 0.635 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "ad2ca0a38802251940de851557477d888ad96e67",
          "message": "feat(play): use a consumable (#1047)\n\nAdd the useConsumable play edit: the activation is spent from the turn, the stack goes\ndown by one (the item is removed at zero), the effect it gives is applied and a healing\nroll restores Hit Points. The encounter tab lists held consumables with a Use button\nand shows the damage or healing roll on a roll card.\n\nCloses #504\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:14:30+10:00",
          "tree_id": "68ad7def9c79e9eb7ad2d7f794fbdb3f53672d57",
          "url": "https://github.com/DavidDudson/pioneer/commit/ad2ca0a38802251940de851557477d888ad96e67"
        },
        "date": 1792235857998,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 28.512,
            "unit": "ms",
            "extra": "median 31.882 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 39.525,
            "unit": "ms",
            "extra": "median 42.229 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 29.668,
            "unit": "ms",
            "extra": "median 33.298 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 27.95,
            "unit": "ms",
            "extra": "median 31.651 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 33.099,
            "unit": "ms",
            "extra": "median 36.788 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 32.872,
            "unit": "ms",
            "extra": "median 35.74 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 31.818,
            "unit": "ms",
            "extra": "median 35.561 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 27.832,
            "unit": "ms",
            "extra": "median 31.564 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 28.016,
            "unit": "ms",
            "extra": "median 30.786 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 37.956,
            "unit": "ms",
            "extra": "median 41.592 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 37.442,
            "unit": "ms",
            "extra": "median 39.785 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 35.161,
            "unit": "ms",
            "extra": "median 38.609 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 27.671,
            "unit": "ms",
            "extra": "median 30.712 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 32.965,
            "unit": "ms",
            "extra": "median 36.403 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 31.845,
            "unit": "ms",
            "extra": "median 34.142 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 40.061,
            "unit": "ms",
            "extra": "median 42.369 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 27.163,
            "unit": "ms",
            "extra": "median 29.124 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 40.431,
            "unit": "ms",
            "extra": "median 43.009 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 41.002,
            "unit": "ms",
            "extra": "median 43.615 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 37.319,
            "unit": "ms",
            "extra": "median 40.034 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 30.269,
            "unit": "ms",
            "extra": "median 33.733 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 28.827,
            "unit": "ms",
            "extra": "median 32.538 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 29.036,
            "unit": "ms",
            "extra": "median 32.417 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 29.516,
            "unit": "ms",
            "extra": "median 33.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 33.09,
            "unit": "ms",
            "extra": "median 35.788 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 30.354,
            "unit": "ms",
            "extra": "median 34.447 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 32.25,
            "unit": "ms",
            "extra": "median 35.017 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 31.418,
            "unit": "ms",
            "extra": "median 34.907 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.167,
            "unit": "ms",
            "extra": "median 8.789 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.584,
            "unit": "ms",
            "extra": "median 8.705 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.9,
            "unit": "ms",
            "extra": "median 1.188 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.088,
            "unit": "ms",
            "extra": "median 1.443 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.599,
            "unit": "ms",
            "extra": "median 1.19 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "65b0711502d18053f4deffc72a857cda937ce11e",
          "message": "feat(content): a variant rule can declare table limits (#1049)\n\nVariantRuleData and VariantRuleDefinition gain optional `limits`, a\nclosed set of the four RuleLimits names, each held to the same ceiling a\nGM or owner is. The effective order is core, then variant rules in\nforce, then the GM's or character's explicit setting. Two variants that\nchange one limit conflict and the more permissive (higher) wins, decided\nonce in mergeVariantLimits and recorded in ADR 0064.\n\nEach limit on the campaign and sheet panels carries a source (core,\nvariant, campaign or character). A reset falls back to the variant's\nnumber, not core.\n\nCloses #929\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:20:59+10:00",
          "tree_id": "2d156f8f7ebdd7fbb24a2e3607259d1df2140802",
          "url": "https://github.com/DavidDudson/pioneer/commit/65b0711502d18053f4deffc72a857cda937ce11e"
        },
        "date": 1792236216947,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 28.372,
            "unit": "ms",
            "extra": "median 32.583 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 39.586,
            "unit": "ms",
            "extra": "median 42.54 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 28.882,
            "unit": "ms",
            "extra": "median 31.576 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.939,
            "unit": "ms",
            "extra": "median 28.683 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 32.098,
            "unit": "ms",
            "extra": "median 34.74 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 32.659,
            "unit": "ms",
            "extra": "median 35.001 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 32.267,
            "unit": "ms",
            "extra": "median 34.47 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 28.054,
            "unit": "ms",
            "extra": "median 30.176 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 28.338,
            "unit": "ms",
            "extra": "median 30.666 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 36.141,
            "unit": "ms",
            "extra": "median 39.224 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 34.375,
            "unit": "ms",
            "extra": "median 36.949 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 33.661,
            "unit": "ms",
            "extra": "median 36.818 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 27.316,
            "unit": "ms",
            "extra": "median 31.433 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 31.006,
            "unit": "ms",
            "extra": "median 33.46 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 28.891,
            "unit": "ms",
            "extra": "median 31.192 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 37.464,
            "unit": "ms",
            "extra": "median 40.819 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 25.647,
            "unit": "ms",
            "extra": "median 27.291 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 37.574,
            "unit": "ms",
            "extra": "median 41.361 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 38.629,
            "unit": "ms",
            "extra": "median 41.034 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 34.689,
            "unit": "ms",
            "extra": "median 37.273 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 28.17,
            "unit": "ms",
            "extra": "median 30.616 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 28.365,
            "unit": "ms",
            "extra": "median 30.237 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 27.895,
            "unit": "ms",
            "extra": "median 29.847 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 28.489,
            "unit": "ms",
            "extra": "median 30.731 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 29.859,
            "unit": "ms",
            "extra": "median 33.325 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 29.848,
            "unit": "ms",
            "extra": "median 32.373 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 30.07,
            "unit": "ms",
            "extra": "median 32.543 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 29.006,
            "unit": "ms",
            "extra": "median 30.498 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.966,
            "unit": "ms",
            "extra": "median 8.923 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.492,
            "unit": "ms",
            "extra": "median 8.569 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.921,
            "unit": "ms",
            "extra": "median 1.13 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.966,
            "unit": "ms",
            "extra": "median 1.187 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.526,
            "unit": "ms",
            "extra": "median 1.057 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "4b559ae70eadfb9d8cee2d70562c270718791f9f",
          "message": "fix(sheet): split focus spell line out of sheetFocus (#1050)\n\nsheetFocus hit the 50-line function cap after sheetInnate moved in.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:26:40+10:00",
          "tree_id": "9a12a268bb45204cff2a8e8aade89cdd37130aaf",
          "url": "https://github.com/DavidDudson/pioneer/commit/4b559ae70eadfb9d8cee2d70562c270718791f9f"
        },
        "date": 1792236554331,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 24.571,
            "unit": "ms",
            "extra": "median 30.945 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 36.199,
            "unit": "ms",
            "extra": "median 39.766 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 26.184,
            "unit": "ms",
            "extra": "median 32.023 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 24.332,
            "unit": "ms",
            "extra": "median 27.364 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 28.224,
            "unit": "ms",
            "extra": "median 31.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 28.035,
            "unit": "ms",
            "extra": "median 31.979 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 27.514,
            "unit": "ms",
            "extra": "median 31.408 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 24.827,
            "unit": "ms",
            "extra": "median 26.559 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 23.929,
            "unit": "ms",
            "extra": "median 27.196 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 31.282,
            "unit": "ms",
            "extra": "median 33.971 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 28.827,
            "unit": "ms",
            "extra": "median 33.718 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 27.936,
            "unit": "ms",
            "extra": "median 33.869 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 22.841,
            "unit": "ms",
            "extra": "median 27.949 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 26.631,
            "unit": "ms",
            "extra": "median 33.087 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 26.236,
            "unit": "ms",
            "extra": "median 31.842 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 32.427,
            "unit": "ms",
            "extra": "median 38.196 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 22.973,
            "unit": "ms",
            "extra": "median 26.155 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 33.169,
            "unit": "ms",
            "extra": "median 39.506 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 38.268,
            "unit": "ms",
            "extra": "median 40.306 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 35.036,
            "unit": "ms",
            "extra": "median 39.602 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 28.19,
            "unit": "ms",
            "extra": "median 31.993 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 25.929,
            "unit": "ms",
            "extra": "median 30.907 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 23.717,
            "unit": "ms",
            "extra": "median 26.297 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 24.111,
            "unit": "ms",
            "extra": "median 27.385 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 25.093,
            "unit": "ms",
            "extra": "median 30.317 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 25.509,
            "unit": "ms",
            "extra": "median 30.264 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 25.46,
            "unit": "ms",
            "extra": "median 29.311 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 24.746,
            "unit": "ms",
            "extra": "median 27.277 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 6.034,
            "unit": "ms",
            "extra": "median 7.527 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 6.516,
            "unit": "ms",
            "extra": "median 7.139 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.776,
            "unit": "ms",
            "extra": "median 1.154 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.785,
            "unit": "ms",
            "extra": "median 0.965 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.388,
            "unit": "ms",
            "extra": "median 0.782 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "7bd142320deb4fed1741d6fb768508f16288f112",
          "message": "feat(content): content browser adopts filter bar, column chooser and table view (#1051)\n\nThe browser's sort, filters, hidden columns and words live in the table\nview query string (ADR-0068): s, f, c, q. The filter bar and the facet\npanel share one state. f is one segment per facet, built from the facet\nURL codec's own text. Columns have codes and hide/show; the kind column\nstarts hidden when one kind is listed.\n\nAlso in frontier: injectTableView takes a reactive schema and gains\napply() for several parts plus page params in one navigation. The mark\nfor a shown column is now ~: a + in a query string reads back as a space.\n\nCloses #958\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:27:09+10:00",
          "tree_id": "b49e575c860dc1715c6cc0f785da66189ee7bd0b",
          "url": "https://github.com/DavidDudson/pioneer/commit/7bd142320deb4fed1741d6fb768508f16288f112"
        },
        "date": 1792236621771,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 29.08,
            "unit": "ms",
            "extra": "median 35.478 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 41.248,
            "unit": "ms",
            "extra": "median 45.268 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 29.553,
            "unit": "ms",
            "extra": "median 33.125 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.881,
            "unit": "ms",
            "extra": "median 29.884 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 32.659,
            "unit": "ms",
            "extra": "median 35.389 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 33.532,
            "unit": "ms",
            "extra": "median 37.26 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 31.951,
            "unit": "ms",
            "extra": "median 35.538 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 28.015,
            "unit": "ms",
            "extra": "median 31.27 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 27.935,
            "unit": "ms",
            "extra": "median 31.875 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 40.302,
            "unit": "ms",
            "extra": "median 43.391 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 37.914,
            "unit": "ms",
            "extra": "median 41.328 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 34.584,
            "unit": "ms",
            "extra": "median 37.688 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 26.747,
            "unit": "ms",
            "extra": "median 30.495 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 31.137,
            "unit": "ms",
            "extra": "median 35.499 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 29.125,
            "unit": "ms",
            "extra": "median 32.714 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 38.508,
            "unit": "ms",
            "extra": "median 42.833 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 25.984,
            "unit": "ms",
            "extra": "median 29.306 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 38.447,
            "unit": "ms",
            "extra": "median 44.203 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 39.795,
            "unit": "ms",
            "extra": "median 44.134 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 35.984,
            "unit": "ms",
            "extra": "median 39.469 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 29.007,
            "unit": "ms",
            "extra": "median 31.763 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 29.537,
            "unit": "ms",
            "extra": "median 36.2 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 28.154,
            "unit": "ms",
            "extra": "median 30.527 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 28.743,
            "unit": "ms",
            "extra": "median 33.123 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 30.606,
            "unit": "ms",
            "extra": "median 35.246 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 30.655,
            "unit": "ms",
            "extra": "median 34.025 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 30.778,
            "unit": "ms",
            "extra": "median 33.82 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 30.247,
            "unit": "ms",
            "extra": "median 34.47 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.014,
            "unit": "ms",
            "extra": "median 8.805 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.52,
            "unit": "ms",
            "extra": "median 8.402 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.975,
            "unit": "ms",
            "extra": "median 1.21 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.002,
            "unit": "ms",
            "extra": "median 1.222 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.543,
            "unit": "ms",
            "extra": "median 1.035 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "2761db47bcc505d62622f415ed92ab9fe9dff4ac",
          "message": "feat(play): change prepared spells during daily preparations (#1054)\n\nDaily preparations offers Change per rank of each prepared entry, which\nopens a spell picker per slot. Picks stay staged, join the preview and\napply in the same command, replacing the build's pick for the slot.\n\nThe server checks each pick as selectSlot does, refuses non-prepared or\nrepeated slots, and writes the build with the play state in one update.\n\nCloses #580\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:39:48+10:00",
          "tree_id": "6c4b8d2680ceed9dba045dd445039f4ed4298849",
          "url": "https://github.com/DavidDudson/pioneer/commit/2761db47bcc505d62622f415ed92ab9fe9dff4ac"
        },
        "date": 1792237346016,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 30.627,
            "unit": "ms",
            "extra": "median 33.998 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 43.772,
            "unit": "ms",
            "extra": "median 46.183 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 32.229,
            "unit": "ms",
            "extra": "median 36.648 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 29.326,
            "unit": "ms",
            "extra": "median 33.156 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 35.7,
            "unit": "ms",
            "extra": "median 38.606 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 36.178,
            "unit": "ms",
            "extra": "median 41.47 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 32.201,
            "unit": "ms",
            "extra": "median 34.866 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 27.903,
            "unit": "ms",
            "extra": "median 29.419 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 27.912,
            "unit": "ms",
            "extra": "median 30.278 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 36.499,
            "unit": "ms",
            "extra": "median 40.508 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 33.929,
            "unit": "ms",
            "extra": "median 37 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 33.406,
            "unit": "ms",
            "extra": "median 37.397 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 26.821,
            "unit": "ms",
            "extra": "median 30.403 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 30.625,
            "unit": "ms",
            "extra": "median 32.486 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 28.549,
            "unit": "ms",
            "extra": "median 29.859 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 39.42,
            "unit": "ms",
            "extra": "median 45.214 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 25.718,
            "unit": "ms",
            "extra": "median 27.192 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 37.899,
            "unit": "ms",
            "extra": "median 40.563 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 38.618,
            "unit": "ms",
            "extra": "median 41.444 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 35.053,
            "unit": "ms",
            "extra": "median 38.294 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 28.842,
            "unit": "ms",
            "extra": "median 30.551 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 28.058,
            "unit": "ms",
            "extra": "median 29.511 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 27.799,
            "unit": "ms",
            "extra": "median 28.93 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 28.454,
            "unit": "ms",
            "extra": "median 30.261 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 29.658,
            "unit": "ms",
            "extra": "median 32.732 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 30.683,
            "unit": "ms",
            "extra": "median 33.912 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 30.439,
            "unit": "ms",
            "extra": "median 32.629 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 29.544,
            "unit": "ms",
            "extra": "median 32.207 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.227,
            "unit": "ms",
            "extra": "median 8.793 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.508,
            "unit": "ms",
            "extra": "median 9.114 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.88,
            "unit": "ms",
            "extra": "median 1.02 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.967,
            "unit": "ms",
            "extra": "median 1.216 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.535,
            "unit": "ms",
            "extra": "median 1.091 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "6daa5a1010682a1f6034607ee4196a5264905d66",
          "message": "feat(sheet): show the class DC in the vitals row (#1055)\n\nSpeeds, armour speed penalties and the class DC statistic already derive\nin the engine; the sheet left the class DC out. It now follows Perception\nin the vitals, with its rank and breakdown.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:42:28+10:00",
          "tree_id": "234ccba70747f21eaa5be433f40217e1b64f2260",
          "url": "https://github.com/DavidDudson/pioneer/commit/6daa5a1010682a1f6034607ee4196a5264905d66"
        },
        "date": 1792237519990,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 33.297,
            "unit": "ms",
            "extra": "median 40.168 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 47.623,
            "unit": "ms",
            "extra": "median 50.879 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 33.846,
            "unit": "ms",
            "extra": "median 39.17 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 31.964,
            "unit": "ms",
            "extra": "median 37.004 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 38.584,
            "unit": "ms",
            "extra": "median 44.014 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 42.186,
            "unit": "ms",
            "extra": "median 45.666 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 40.246,
            "unit": "ms",
            "extra": "median 44.035 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 34.045,
            "unit": "ms",
            "extra": "median 40.176 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 33.692,
            "unit": "ms",
            "extra": "median 38.789 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 45.442,
            "unit": "ms",
            "extra": "median 48.022 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 40.592,
            "unit": "ms",
            "extra": "median 45.813 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 40.95,
            "unit": "ms",
            "extra": "median 45.301 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 33.106,
            "unit": "ms",
            "extra": "median 37.071 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 39.169,
            "unit": "ms",
            "extra": "median 42.213 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 36.528,
            "unit": "ms",
            "extra": "median 40.252 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 46.172,
            "unit": "ms",
            "extra": "median 50.851 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 31.734,
            "unit": "ms",
            "extra": "median 37.003 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 46.888,
            "unit": "ms",
            "extra": "median 51.435 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 46.58,
            "unit": "ms",
            "extra": "median 51.315 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 42.681,
            "unit": "ms",
            "extra": "median 48.571 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 35.452,
            "unit": "ms",
            "extra": "median 39.967 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 36.649,
            "unit": "ms",
            "extra": "median 39.864 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 36.086,
            "unit": "ms",
            "extra": "median 39.564 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 35.394,
            "unit": "ms",
            "extra": "median 40.56 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 37.464,
            "unit": "ms",
            "extra": "median 42.332 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 38.81,
            "unit": "ms",
            "extra": "median 42.491 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 36.55,
            "unit": "ms",
            "extra": "median 41.51 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 35.045,
            "unit": "ms",
            "extra": "median 38.972 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 8.055,
            "unit": "ms",
            "extra": "median 10.852 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 8.775,
            "unit": "ms",
            "extra": "median 9.755 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 1.141,
            "unit": "ms",
            "extra": "median 1.339 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.127,
            "unit": "ms",
            "extra": "median 1.389 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.43,
            "unit": "ms",
            "extra": "median 1.157 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "0742f8fd2849e49ef51c26884bdc4dfdf781ab36",
          "message": "fix(ci): get main green again after the pack loader and sheet merges (#1057)\n\nBranded-number comparisons in the rule-limit, consumable-command and db\ntests no longer trip TS2769; the new Lost Omens backgrounds are expected\nin the trained-marks spec; the initiative bar assertions wait for the\nbar; the sheet-page spec has no conditional; the loading skeleton in\nsheet-spells is three static rows (template complexity); two long doc\nlines are wrapped; the Upion name is allowed in typos; unused exports\n(Blow, ConsumableRoll) and the dead rollConsumable are removed.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:51:01+10:00",
          "tree_id": "91c04bd3f28d5d66c16d2406f1fd3e076c73719d",
          "url": "https://github.com/DavidDudson/pioneer/commit/0742f8fd2849e49ef51c26884bdc4dfdf781ab36"
        },
        "date": 1792237988334,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 19.646,
            "unit": "ms",
            "extra": "median 21.125 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 26.926,
            "unit": "ms",
            "extra": "median 30.575 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 20.995,
            "unit": "ms",
            "extra": "median 23.608 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 18.978,
            "unit": "ms",
            "extra": "median 19.958 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 22.336,
            "unit": "ms",
            "extra": "median 23.096 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 22.724,
            "unit": "ms",
            "extra": "median 23.552 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 22.167,
            "unit": "ms",
            "extra": "median 22.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 19.971,
            "unit": "ms",
            "extra": "median 20.565 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 19.981,
            "unit": "ms",
            "extra": "median 20.594 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 25.242,
            "unit": "ms",
            "extra": "median 26.305 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 23.884,
            "unit": "ms",
            "extra": "median 24.588 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 23.589,
            "unit": "ms",
            "extra": "median 24.236 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 19.4,
            "unit": "ms",
            "extra": "median 22.021 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 24.287,
            "unit": "ms",
            "extra": "median 25.06 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 22.38,
            "unit": "ms",
            "extra": "median 23.146 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 25.552,
            "unit": "ms",
            "extra": "median 27.018 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 18.319,
            "unit": "ms",
            "extra": "median 18.903 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 26.029,
            "unit": "ms",
            "extra": "median 26.849 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 26.598,
            "unit": "ms",
            "extra": "median 27.587 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 24.184,
            "unit": "ms",
            "extra": "median 25.115 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 20.285,
            "unit": "ms",
            "extra": "median 21.115 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 20.143,
            "unit": "ms",
            "extra": "median 20.992 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 19.952,
            "unit": "ms",
            "extra": "median 20.789 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 20.203,
            "unit": "ms",
            "extra": "median 20.973 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 21.033,
            "unit": "ms",
            "extra": "median 22.092 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 23.543,
            "unit": "ms",
            "extra": "median 24.379 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 21.093,
            "unit": "ms",
            "extra": "median 22.292 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 20.627,
            "unit": "ms",
            "extra": "median 21.483 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 4.442,
            "unit": "ms",
            "extra": "median 5.926 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 4.833,
            "unit": "ms",
            "extra": "median 5.319 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.503,
            "unit": "ms",
            "extra": "median 0.653 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 0.559,
            "unit": "ms",
            "extra": "median 0.767 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.305,
            "unit": "ms",
            "extra": "median 0.601 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "f04742de2e7b2d4063a827e8223702109d5d0aec",
          "message": "feat(frontier): fr-drawer full-screen overlay on narrow screens (#1058)\n\nBelow the lg container size of the row it sits in, fr-drawer is a native\ndialog shown with showModal(): full screen, backdrop, focus trapped,\nEscape closes, page inert. At lg and above it stays the docked, non-modal\npanel (dialog.show()). Crossing lg while open switches mode on the same\ndialog and keeps its scroll. The resize handle is hidden in overlay mode.\n\nADR-0065 and the frontier AGENTS.md name this as the one modal exception;\nfr-drawer becomes the sole owner of dialog in no-native-elements.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:53:01+10:00",
          "tree_id": "d5ef04c10fb76f53a734de19a589f323c5777655",
          "url": "https://github.com/DavidDudson/pioneer/commit/f04742de2e7b2d4063a827e8223702109d5d0aec"
        },
        "date": 1792238186973,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 29.127,
            "unit": "ms",
            "extra": "median 35.759 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 39.257,
            "unit": "ms",
            "extra": "median 47.816 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 29.834,
            "unit": "ms",
            "extra": "median 33.73 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 26.932,
            "unit": "ms",
            "extra": "median 36.653 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 32.782,
            "unit": "ms",
            "extra": "median 40.226 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 32.141,
            "unit": "ms",
            "extra": "median 38.858 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 31.011,
            "unit": "ms",
            "extra": "median 36.291 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 29.505,
            "unit": "ms",
            "extra": "median 36.201 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 31.452,
            "unit": "ms",
            "extra": "median 37.71 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 37.685,
            "unit": "ms",
            "extra": "median 42.823 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 34.683,
            "unit": "ms",
            "extra": "median 41.139 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 37.257,
            "unit": "ms",
            "extra": "median 41.281 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 27.799,
            "unit": "ms",
            "extra": "median 33.441 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 32.672,
            "unit": "ms",
            "extra": "median 39.332 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 31.905,
            "unit": "ms",
            "extra": "median 36.23 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 40.658,
            "unit": "ms",
            "extra": "median 44.052 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 26.582,
            "unit": "ms",
            "extra": "median 33.173 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 39.293,
            "unit": "ms",
            "extra": "median 43.846 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 39.35,
            "unit": "ms",
            "extra": "median 44.417 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 37.336,
            "unit": "ms",
            "extra": "median 42.117 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 29.782,
            "unit": "ms",
            "extra": "median 33.215 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 29.079,
            "unit": "ms",
            "extra": "median 32.334 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 27.806,
            "unit": "ms",
            "extra": "median 31.727 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 28.685,
            "unit": "ms",
            "extra": "median 33.261 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 30.031,
            "unit": "ms",
            "extra": "median 35.714 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 30.609,
            "unit": "ms",
            "extra": "median 34.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 30.059,
            "unit": "ms",
            "extra": "median 37.815 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 33.913,
            "unit": "ms",
            "extra": "median 36.734 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.538,
            "unit": "ms",
            "extra": "median 9.696 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.871,
            "unit": "ms",
            "extra": "median 9.485 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.888,
            "unit": "ms",
            "extra": "median 1.161 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.049,
            "unit": "ms",
            "extra": "median 1.284 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.546,
            "unit": "ms",
            "extra": "median 1.127 ms, 51 runs after 20 warm-up, budget 3 ms"
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
          "id": "d99c60992bd7fce90844ab693aa8a64f78f4b922",
          "message": "chore(play): validate spend flags against content (#1046)\n\ncheckSpend trusted the client's attack flag and spell payment. Refuse an\nattack flag on an action, feat, class feature or spell without the attack\ntrait, and a Focus Point for a non-focus spell or a slot for a focus spell\nor cantrip. Strikes use the weapon's id, which has no attack trait, so\nkinds other than those are left unvalidated.\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-10-17T21:52:27+10:00",
          "tree_id": "f723dc48dca7056422d7f351fc854c4f7691c94b",
          "url": "https://github.com/DavidDudson/pioneer/commit/d99c60992bd7fce90844ab693aa8a64f78f4b922"
        },
        "date": 1792238188700,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "character: level 20 Bard with every slot and its gear filled",
            "value": 33.792,
            "unit": "ms",
            "extra": "median 39.151 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Cleric with every slot and its gear filled",
            "value": 45.515,
            "unit": "ms",
            "extra": "median 51.342 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Druid with every slot and its gear filled",
            "value": 35.468,
            "unit": "ms",
            "extra": "median 39.08 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Fighter with every slot and its gear filled",
            "value": 34.897,
            "unit": "ms",
            "extra": "median 37.791 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Ranger with every slot and its gear filled",
            "value": 39.799,
            "unit": "ms",
            "extra": "median 43.995 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Rogue with every slot and its gear filled",
            "value": 37.945,
            "unit": "ms",
            "extra": "median 42.222 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Witch with every slot and its gear filled",
            "value": 38.866,
            "unit": "ms",
            "extra": "median 42.212 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Wizard with every slot and its gear filled",
            "value": 33.244,
            "unit": "ms",
            "extra": "median 39.237 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Alchemist with every slot and its gear filled",
            "value": 33.932,
            "unit": "ms",
            "extra": "median 39.346 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Barbarian with every slot and its gear filled",
            "value": 41.2,
            "unit": "ms",
            "extra": "median 46.559 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Champion with every slot and its gear filled",
            "value": 39.419,
            "unit": "ms",
            "extra": "median 46.694 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Investigator with every slot and its gear filled",
            "value": 38.659,
            "unit": "ms",
            "extra": "median 41.963 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Monk with every slot and its gear filled",
            "value": 31.291,
            "unit": "ms",
            "extra": "median 36.522 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Oracle with every slot and its gear filled",
            "value": 35.698,
            "unit": "ms",
            "extra": "median 40.896 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Sorcerer with every slot and its gear filled",
            "value": 34.844,
            "unit": "ms",
            "extra": "median 38.647 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Swashbuckler with every slot and its gear filled",
            "value": 42.087,
            "unit": "ms",
            "extra": "median 47.478 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Animist with every slot and its gear filled",
            "value": 32.504,
            "unit": "ms",
            "extra": "median 36.396 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Exemplar with every slot and its gear filled",
            "value": 41.987,
            "unit": "ms",
            "extra": "median 47.578 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Kineticist with every slot and its gear filled",
            "value": 41.002,
            "unit": "ms",
            "extra": "median 48.648 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Thaumaturge with every slot and its gear filled",
            "value": 36.905,
            "unit": "ms",
            "extra": "median 41.743 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Magus with every slot and its gear filled",
            "value": 30.489,
            "unit": "ms",
            "extra": "median 34.449 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Necromancer with every slot and its gear filled",
            "value": 30.542,
            "unit": "ms",
            "extra": "median 34.615 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Runesmith with every slot and its gear filled",
            "value": 30.64,
            "unit": "ms",
            "extra": "median 36.31 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Summoner with every slot and its gear filled",
            "value": 30.441,
            "unit": "ms",
            "extra": "median 34.754 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Gunslinger with every slot and its gear filled",
            "value": 31.198,
            "unit": "ms",
            "extra": "median 36.67 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Inventor with every slot and its gear filled",
            "value": 32.223,
            "unit": "ms",
            "extra": "median 37.28 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Commander with every slot and its gear filled",
            "value": 32.367,
            "unit": "ms",
            "extra": "median 37.655 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "character: level 20 Guardian with every slot and its gear filled",
            "value": 30.956,
            "unit": "ms",
            "extra": "median 37.415 ms, 51 runs after 20 warm-up"
          },
          {
            "name": "catalog: level 20 Fighter derives grants and every statistic",
            "value": 7.275,
            "unit": "ms",
            "extra": "median 9.914 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception",
            "value": 7.85,
            "unit": "ms",
            "extra": "median 8.855 ms, 51 runs after 20 warm-up, budget 10 ms"
          },
          {
            "name": "grants: a query over 1000 entries",
            "value": 0.849,
            "unit": "ms",
            "extra": "median 1.201 ms, 51 runs after 20 warm-up, budget 2 ms"
          },
          {
            "name": "grants: level 20 character with every slot picked over 1000 more feats",
            "value": 1.023,
            "unit": "ms",
            "extra": "median 1.259 ms, 51 runs after 20 warm-up, budget 3 ms"
          },
          {
            "name": "grants: level 20 Fighter resolves to a fixpoint",
            "value": 0.564,
            "unit": "ms",
            "extra": "median 1.117 ms, 51 runs after 20 warm-up, budget 3 ms"
          }
        ]
      }
    ]
  }
}