window.BENCHMARK_DATA = {
  "lastUpdate": 1792073987671,
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
      }
    ]
  }
}