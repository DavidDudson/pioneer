/**
 * Runs every `*.bench.ts` in the workspace, each in its own process so one case's heap and JIT state cannot colour
 * the next, one after another so they do not compete for the machine. Prints each file's output, then writes the
 * results as JSON for `benchmark-action/github-action-benchmark` (`customSmallerIsBetter`) to `--out`
 * (default `tmp/bench-results.json`), and a Markdown table to `--summary` when given. Exits non-zero when a file
 * fails, a budget included; the results are written first, so a regression is still recorded.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { Glob } from 'bun';

import { parseResults, toMarkdownTable, toTrackerEntries } from './bench-report.ts';

const BENCHES = new Glob('{apps,libs}/**/*.bench.ts');
const DEFAULT_OUT = 'tmp/bench-results.json';

const { values } = parseArgs({
  options: { out: { type: 'string', default: DEFAULT_OUT }, summary: { type: 'string' } },
});

const scanned = await Array.fromAsync(BENCHES.scan({ dot: false }));
const files = scanned.filter((file) => !file.includes('node_modules')).toSorted();

interface FileRun {
  readonly output: string;
  readonly passed: boolean;
}

async function runFile(file: string): Promise<FileRun> {
  const child = Bun.spawn(['bun', file], { stdout: 'pipe', stderr: 'inherit' });
  const output = await new Response(child.stdout).text();
  process.stdout.write(output);
  const exitCode = await child.exited;
  return { output, passed: exitCode === 0 };
}

const outputs: string[] = [];
const failed: string[] = [];
for (const file of files) {
  console.log(`\n== ${file}`);
  // Sequential on purpose: parallel benches would time each other.
  // oxlint-disable-next-line eslint/no-await-in-loop
  const { output, passed } = await runFile(file);
  outputs.push(output);
  if (!passed) {
    failed.push(file);
  }
}

const results = parseResults(outputs.join('\n'));
const { out } = values;
await mkdir(path.dirname(out), { recursive: true });
await Bun.write(out, `${JSON.stringify(toTrackerEntries(results), undefined, 2)}\n`);
if (values.summary !== undefined) {
  await Bun.write(values.summary, `${toMarkdownTable(results)}\n`);
}
console.log(`\n${results.length} benchmarks from ${files.length} files, written to ${out}`);
if (failed.length > 0) {
  console.error(`failed: ${failed.join(', ')}`);
  process.exitCode = 1;
}
