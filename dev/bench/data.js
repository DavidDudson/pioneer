window.BENCHMARK_DATA = {
  "lastUpdate": 1792104112990,
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
      }
    ]
  }
}