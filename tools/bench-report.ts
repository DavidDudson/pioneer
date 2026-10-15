/**
 * What `bun run bench` does with the results the bench files print: reads them out of the output, shapes them for
 * `benchmark-action/github-action-benchmark` (`customSmallerIsBetter`) and writes the table the job summary shows.
 */
import { BENCH_MARKER } from '@pioneer/shared/bench';
import type { BenchResult } from '@pioneer/shared/bench';
import * as z from 'zod';

const BenchResultSchema = z.object({
  name: z.string(),
  fastestMs: z.number(),
  medianMs: z.number(),
  timedRuns: z.number(),
  warmupRuns: z.number(),
  budgetMs: z.number().optional(),
});

/** One entry of the tracker's JSON. `extra` shows beside the value in a chart's tooltip. */
export interface TrackerEntry {
  readonly name: string;
  readonly unit: string;
  readonly value: number;
  readonly extra: string;
}

/** The results in `output`, one per marker line; anything else a bench printed is skipped. */
export function parseResults(output: string): BenchResult[] {
  return output
    .split('\n')
    .filter((line) => line.startsWith(BENCH_MARKER))
    .map((line) => BenchResultSchema.parse(JSON.parse(line.slice(BENCH_MARKER.length))));
}

/** The tracker tracks the fastest run, the stablest of them; the median and budget ride along as context. */
export function toTrackerEntries(results: readonly BenchResult[]): TrackerEntry[] {
  return results.map(({ name, fastestMs, medianMs, timedRuns, warmupRuns, budgetMs }) => ({
    name,
    unit: 'ms',
    value: fastestMs,
    extra: [
      `median ${medianMs} ms`,
      `${timedRuns} runs after ${warmupRuns} warm-up`,
      ...(budgetMs === undefined ? [] : [`budget ${budgetMs} ms`]),
    ].join(', '),
  }));
}

/** A Markdown table of the results, for the job summary. */
export function toMarkdownTable(results: readonly BenchResult[]): string {
  const rows = results.map(
    ({ name, fastestMs, medianMs, budgetMs }) => `| ${name} | ${fastestMs} | ${medianMs} | ${budgetMs ?? ''} |`,
  );
  return ['| Benchmark | Fastest (ms) | Median (ms) | Budget (ms) |', '| --- | ---: | ---: | ---: |', ...rows].join(
    '\n',
  );
}
