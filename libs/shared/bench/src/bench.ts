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

/**
 * The calibration workload's fastest time on the dev machine budgets are set for, in milliseconds. A machine that
 * takes twice as long gets budgets twice as long (see `speedFactor`).
 */
export const REFERENCE_CALIBRATION_MS = 5;

/** Rounds of the calibration workload; the fastest stands, as for a case. */
const CALIBRATION_ROUNDS = 7;
const CALIBRATION_ITEMS = 20_000;
/** A prime, so the keys collide the same way on every machine. */
const CALIBRATION_KEYS = 10_007;
const CALIBRATION_STRIDE = 7919;

/** Extra rounds of timed runs a case over its budget gets: a slow stretch on a shared runner passes, a regression does not. */
const RETRY_ROUNDS = 2;

export interface BenchSpec<Given> {
  /** The key the history tracks the case under: renaming it starts a new chart. */
  readonly name: string;
  /**
   * A budget in milliseconds on a dev machine. The fastest run over it fails the case, as a hard assertion. A slower
   * machine, by how long the calibration workload takes on it, gets the budget scaled up (`speedFactor`), so one number
   * holds on every runner.
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

/** The budget a run is held to: the dev-machine budget, scaled by how much slower this machine is. */
export function budgetFor(budgetMs: number | undefined, speed: number): number | undefined {
  return budgetMs === undefined ? budgetMs : rounded(budgetMs * speed);
}

/** One pass of a fixed workload shaped like the code under test: objects, a map and a sort over string keys. */
function calibrationWork(): number {
  const counts = new Map<string, number>();
  const items: { readonly key: string; readonly value: number }[] = [];
  for (let index = 0; index < CALIBRATION_ITEMS; index += 1) {
    const key = `key-${(index * CALIBRATION_STRIDE) % CALIBRATION_KEYS}`;
    items.push({ key, value: index });
    counts.set(key, (counts.get(key) ?? 0) + index);
  }
  items.sort((left, right) => left.key.localeCompare(right.key));
  return items.length + counts.size;
}

/** Milliseconds the calibration workload takes on this machine: the fastest of a few rounds, as for a case. */
export function calibrate(): number {
  const times = Array.from({ length: CALIBRATION_ROUNDS }, (): number => {
    const start = performance.now();
    calibrationWork();
    return performance.now() - start;
  });
  return Math.min(...times);
}

/** How many times slower than the dev machine a calibration of `calibrationMs` is; never under 1, so a fast machine keeps the given budget. */
export function speedFactor(calibrationMs: number): number {
  return Math.max(1, calibrationMs / REFERENCE_CALIBRATION_MS);
}

/** This machine's speed factor, measured once per process: every case in a bench file runs on the same machine. */
let measuredSpeed: number | undefined = undefined;
function machineSpeed(): number {
  if (measuredSpeed === undefined) {
    const calibrationMs = calibrate();
    measuredSpeed = speedFactor(calibrationMs);
    console.log(`bench machine: calibration ${rounded(calibrationMs)} ms, budgets x${rounded(measuredSpeed)}`);
  }
  return measuredSpeed;
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
export function benchmark<Given>(spec: BenchSpec<Given>, speed?: number): BenchResult {
  const warmupRuns = spec.warmupRuns ?? DEFAULT_WARMUP_RUNS;
  const timedRuns = spec.timedRuns ?? DEFAULT_TIMED_RUNS;
  for (let warm = 0; warm < warmupRuns; warm += 1) {
    spec.run(spec.prepare());
  }
  const budgetMs = budgetFor(spec.budgetMs, speed ?? machineSpeed());
  const times = timeWithRetries(spec, timedRuns, budgetMs);
  const result = summarise({ name: spec.name, budgetMs }, times, warmupRuns);
  report(result);
  return result;
}
