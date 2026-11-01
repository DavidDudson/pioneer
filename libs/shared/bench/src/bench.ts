/**
 * The benchmark harness. A `*.bench.ts` file calls `benchmark` for each case; `bun run bench` (`tools/bench.ts`) runs
 * every such file in its own process and reads the results from the marker lines they print.
 */

/** Marks the line holding a result's JSON, so the runner finds it among whatever else a bench prints. */
export const BENCH_MARKER = '##bench ';

/** Runs before the first timed one, so the engine has compiled and cached what the code under test touches. */
export const DEFAULT_WARMUP_RUNS = 20;
/** Odd, so the median is one of the timings. */
export const DEFAULT_TIMED_RUNS = 51;

const HALF = 2;
const DECIMALS = 1000;

/** How much slower a shared CI runner is than a dev machine: the ratio of the two, measured across the suite, ran 2.3 to 2.8. */
export const CI_RUNNER_MULTIPLIER = 2.5;

/** Extra rounds of timed runs a case over its budget gets: a slow stretch on a shared runner passes, a regression does not. */
const RETRY_ROUNDS = 2;

export interface BenchSpec<Given> {
  /** The key the history tracks the case under: renaming it starts a new chart. */
  readonly name: string;
  /**
   * A budget in milliseconds on a dev machine. The fastest run over it fails the case, as a hard assertion. On CI
   * (`CI` set) the budget is scaled by `CI_RUNNER_MULTIPLIER`, so one number holds on both.
   */
  readonly budgetMs?: number | undefined;
  /** Builds what one run is given, outside the timer, fresh for every run. */
  readonly prepare: () => Given;
  /** The work under test. */
  readonly run: (given: Given) => unknown;
  readonly warmupRuns?: number;
  readonly timedRuns?: number;
}

export interface BenchResult {
  readonly name: string;
  /** Milliseconds of the fastest timed run: other work on the machine only ever adds time, so it is the stablest. */
  readonly fastestMs: number;
  readonly medianMs: number;
  readonly timedRuns: number;
  readonly warmupRuns: number;
  readonly budgetMs?: number | undefined;
}

/** The middle of the timings, or the mean of the two in the middle. */
export function median(times: readonly number[]): number {
  const sorted = times.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / HALF);
  const upper = sorted[middle] ?? Number.NaN;
  const lower = sorted[middle - 1] ?? upper;
  return sorted.length % HALF === 0 ? (lower + upper) / HALF : upper;
}

/** The budget a run is held to: the dev-machine budget, scaled up on a CI runner. */
export function budgetFor(budgetMs: number | undefined, onCi: boolean): number | undefined {
  return budgetMs === undefined || !onCi ? budgetMs : budgetMs * CI_RUNNER_MULTIPLIER;
}

/** Milliseconds to three decimals, so a result reads as it will in a chart. */
function rounded(milliseconds: number): number {
  return Math.round(milliseconds * DECIMALS) / DECIMALS;
}

/** The result of timings taken in milliseconds. */
export function summarise(
  spec: Pick<BenchSpec<unknown>, 'name' | 'budgetMs'>,
  times: readonly number[],
  warmupRuns: number,
): BenchResult {
  return {
    name: spec.name,
    fastestMs: rounded(Math.min(...times)),
    medianMs: rounded(median(times)),
    timedRuns: times.length,
    warmupRuns,
    ...(spec.budgetMs === undefined ? {} : { budgetMs: spec.budgetMs }),
  };
}

/** Prints a result and its marker line, and fails the process when the fastest run is over the budget. */
function report(result: BenchResult): void {
  const budget = result.budgetMs === undefined ? '' : ` (budget ${result.budgetMs} ms)`;
  console.log(`${result.name}: fastest ${result.fastestMs} ms, median ${result.medianMs} ms${budget}`);
  console.log(`${BENCH_MARKER}${JSON.stringify(result)}`);
  if (result.budgetMs !== undefined && result.fastestMs >= result.budgetMs) {
    console.error(`FAIL ${result.name}: fastest ${result.fastestMs} ms is not under the ${result.budgetMs} ms budget`);
    process.exitCode = 1;
  }
}

/** One round of timed runs, in milliseconds. */
function timeRound<Given>(spec: BenchSpec<Given>, timedRuns: number): number[] {
  return Array.from({ length: timedRuns }, (): number => {
    const given = spec.prepare();
    const start = performance.now();
    spec.run(given);
    return performance.now() - start;
  });
}

/** Whether the fastest of the timings is not under the budget. */
function overBudget(times: readonly number[], budgetMs: number | undefined): boolean {
  return budgetMs !== undefined && Math.min(...times) >= budgetMs;
}

/** Times a round, then up to `RETRY_ROUNDS` more while the fastest run stays over the budget. */
function timeWithRetries<Given>(spec: BenchSpec<Given>, timedRuns: number, budgetMs: number | undefined): number[] {
  const times = timeRound(spec, timedRuns);
  for (let retry = 0; retry < RETRY_ROUNDS && overBudget(times, budgetMs); retry += 1) {
    times.push(...timeRound(spec, timedRuns));
  }
  return times;
}

/**
 * Warms up, times the runs, prints and reports the result. A case whose fastest run is over the budget is timed again
 * (`RETRY_ROUNDS` times) before it fails. A fastest run still over the budget prints why and sets a failing exit code,
 * after the result is reported, so the history still records the regression.
 */
export function benchmark<Given>(spec: BenchSpec<Given>): BenchResult {
  const warmupRuns = spec.warmupRuns ?? DEFAULT_WARMUP_RUNS;
  const timedRuns = spec.timedRuns ?? DEFAULT_TIMED_RUNS;
  for (let warm = 0; warm < warmupRuns; warm += 1) {
    spec.run(spec.prepare());
  }
  const onCi = Bun.env['CI'] !== undefined && Bun.env['CI'] !== '';
  const budgetMs = budgetFor(spec.budgetMs, onCi);
  const times = timeWithRetries(spec, timedRuns, budgetMs);
  const result = summarise({ name: spec.name, budgetMs }, times, warmupRuns);
  report(result);
  return result;
}
