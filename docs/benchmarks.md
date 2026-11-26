# Benchmarks

Benchmarks run as one suite, apart from the tests, and their history is tracked on GitHub Pages.

- Run them: `bun run bench`. It runs every `*.bench.ts` in `apps/` and `libs/`, each in its own process and one
  after another, prints each result and writes `tmp/bench-results.json` (`--out` changes the path; `--summary <file>`
  also writes a Markdown table). It exits non-zero when a benchmark is over its budget or its file fails.
- Read the history: <https://daviddudson.github.io/pioneer/dev/bench/>, one chart per benchmark, the fastest run per
  commit on `main`. Hovering a point shows the median, the run counts and the budget.
- Pull requests: the Benchmarks workflow (`.github/workflows/bench.yml`) runs the suite against the baseline
  recorded for `main`. A benchmark that takes more than 1.5 times its baseline comments on the commit and fails the
  check; the job summary shows a table of every result.

## Add a benchmark

Create `<name>.bench.ts` beside the code it measures and call `benchmark` from `@pioneer/shared/bench` for each case:

```ts
import { expect } from 'bun:test';

import { benchmark } from '@pioneer/shared/bench';

expect(resolveGrants(inputs()).open).toEqual([]); // the case measures what it should
benchmark({
  name: 'grants: level 20 Fighter resolves to a fixpoint',
  budgetMs: 3,
  prepare: inputs,
  run: resolveGrants,
});
```

- `prepare` builds what a run is given, outside the timer, fresh for every run. `run` is the only thing timed.
- `budgetMs` is optional, and set for the dev machine. Each bench process first times a fixed calibration workload
  (`calibrate`, about 5 ms on the dev machine) and multiplies every budget by how many times longer it took than
  `REFERENCE_CALIBRATION_MS`, never by less than 1. A slow shared runner then gets a proportionally longer budget, and a
  fast one keeps the given number. A fastest run at or over the budget fails the benchmark, as a hard assertion, after its
  result is written. A benchmark without a budget is tracked only.
- Check the result is right with `expect` before the benchmark: a fast wrong answer is not a result.
- `name` is the key the history tracks the benchmark under, so renaming one starts a new chart. Prefix it with its
  area (`grants:`, `catalog:`, `character:`).
- A bench file is a script, not a test: `bun test` does not run it. Run one with `bun path/to/x.bench.ts`.

## How a run is measured

Each benchmark warms up for 20 runs, then times 51. It reports the **fastest** run, which the history tracks, and the
**median**. Anything else running on the machine only ever adds time, so the fastest run is the closest to what the
code itself costs; the median shows how noisy the rest were.

Noise, from six runs of the suite on a developer machine: the fastest run varied by about 5 to 15 % between runs
(0.38 to 0.43 ms for a query over a thousand entries, 1.76 to 1.95 ms for a full derivation), and the median by a
little more. Shared CI runners are noisier and slower than that, so the regression threshold is a generous 150 % of
the baseline, and each budget is far above what the code takes. Compare a chart's points over days, not neighbouring
commits.

## Page budgets

Benchmarks time code; the page budgets time what a visitor downloads. `bun run perf:pages` (`tools/page-budget.ts`)
opens the character list and a character sheet in Lighthouse (`@lhci/cli`, desktop preset, three runs per page, the
median kept) and records the **request count**, the **transfer size** and the **LCP** of each.

Run it: build the app with `nx run web:build:production`, serve it from the dev entrypoint, which serves `WEB_DIST`
from its own origin and keeps the dev sign-in, then run the tool against that origin:

```sh
WEB_DIST=dist/apps/web/browser PORT=3000 PUBLIC_ORIGIN=http://localhost:3000 bun apps/api/src/main.dev.ts
bun tools/page-budget.ts --api http://localhost:3000 --web http://localhost:3000
```

It signs in as the dev player, makes a throwaway level 1 character (`--character <id>` names a bigger one), writes
`tmp/page-budget-results.json` (`--out`) and a Markdown table (`--summary`), and keeps the full reports in `tmp/lhci`.
It exits non-zero when a page is over its budget, after the results are written.

- Read the history: <https://daviddudson.github.io/pioneer/dev/pages/>, one chart per page and metric, recorded on
  every push to `main`.
- Pull requests: the Page budgets workflow (`.github/workflows/page-budget.yml`) runs the same tool against the
  production build, fails the check on a page over its budget, and keeps the Lighthouse reports as an artifact.

The budgets are in `lighthouserc.json`, set about 10 % above the numbers of `main` when they were added, so a story
that makes a page bigger fails the check. Lower a budget in the PR that earns it; raise one only with a reason in
the PR.

| Page              | Requests (now / budget) | Transfer (now / budget) | LCP (now / budget) |
| ----------------- | ----------------------: | ----------------------: | -----------------: |
| `/characters`     |               464 / 510 |         4.2 MB / 4.7 MB |        0.2 s / 1 s |
| `/characters/:id` |             1233 / 1360 |         6.3 MB / 7.1 MB |        0.2 s / 1 s |

- The counts and sizes repeat from run to run, so their budgets are tight. LCP is simulated, so it moves with the
  machine and its budget is far above what the page takes: it catches a page that stops painting early, not a
  small slip.
- Requests and transfer count every resource the page fetches while Lighthouse watches it load, third-party fonts
  included.
- The sheet redirects to its last tab; the result is named for the sheet (`/characters/:id`) whatever tab it lands on.

## One-time setup

The history lives on a `gh-pages` branch, created by the first run on `main`. After it exists, enable GitHub Pages for
the repository from the `gh-pages` branch, root folder, so the charts are served at the URL above.

## Scans audited

An audit of `.find`, `.some` and `.includes` calls in the hot paths (#1722 perf: replace list scans with maps in hot
paths). A scan is a problem only inside a loop over a long list; a single lookup on a short list is cheaper than an
index.

Fixed, with a benchmark:

| Path                                                               | Before                   | After  | Benchmark                                       |
| ------------------------------------------------------------------ | ------------------------ | ------ | ----------------------------------------------- |
| `spellFilterGroups`: each spell's values worked out once per group | 2.43 ms over 1000 spells | 0.5 ms | `character: count the spell filter options ...` |

Changed for consistency, with a benchmark: the `includes` and `some` dedupe in `addPoolSpells`, `addFocusSpells`,
`addInnateSpells` and `addGrantedSpells` is now a `Set` lookup. Their lists are capped at 8 to 64 spells, so the scan
never cost anything measurable (0.10 ms before and after, `engine: gather the spells of a level 20 caster`); it is
the one short-list scan rewritten, so that the four gather paths dedupe the same way.

Measured and left alone:

- `spellRows` (the spell picker's row builder): 0.04 ms over 1000 spells, already one pass with a `Set` for the spells
  the entry holds.
- `filterSpells`: 0.4 ms over 1000 spells, one pass.
- Grant resolution (`resolve-grants.ts`), `lookupOf`, the candidate options' access index and `traitNames` (cached
  per registry in a `WeakMap`): already index-based.
- The `.find` calls in `slot-candidates.ts` and `sheet-spell-*.ts`: single lookups, not inside a loop over a long
  list.
- The other `.find` calls on short lists (a character's slots, a class's levels): not rewritten.

Not a scan: `apps/api/src/level-20-builds.bench.ts` (24 to 48 ms) spends about 40 % of its time in zod parsing
(`RollOption.parse`, `libs/rules/sdk/src/roll-option.ts`). That is a separate piece of work.
