window.BENCHMARK_DATA = {
  "lastUpdate": 1792069903675,
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
      }
    ]
  }
}