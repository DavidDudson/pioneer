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

## One-time setup

The history lives on a `gh-pages` branch, created by the first run on `main`. After it exists, enable GitHub Pages for
the repository from the `gh-pages` branch, root folder, so the charts are served at the URL above.

## Scans audited

An audit of `.find`, `.some` and `.includes` calls in the hot paths (#1722 perf: replace list scans with maps in hot
paths). A scan is a problem only inside a loop over a long list; a single lookup on a short list is cheaper than an
index.

Fixed, with a benchmark each:

| Path                                                               | Before                     | After   | Benchmark                                        |
| ------------------------------------------------------------------ | -------------------------- | ------- | ------------------------------------------------ |
| `spellFilterGroups`: each spell's values worked out once per group | 2.43 ms over 1000 spells   | 0.65 ms | `character: count the spell filter options ...`  |
| `gatherSpells`: `Set` dedupe, not `includes`/`some` per spell      | 0.10 ms (lists of 8 to 64) | 0.10 ms | `engine: gather the spells of a level 20 caster` |

The gather change is for consistency: its lists are capped at 8 to 64 spells, so the nested scan never cost anything
measurable.

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
