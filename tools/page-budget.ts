/**
 * Measures what opening the character list and a character sheet costs, in Lighthouse, and fails when a page goes over
 * its budget (`lighthouserc.json`, documented in docs/benchmarks.md).
 *
 *   bun tools/page-budget.ts [--web http://localhost:3000] [--api http://localhost:3000] [--character <id>]
 *     [--out tmp/page-budget-results.json] [--summary tmp/page-budget-summary.md]
 *
 * Needs the dev entrypoint serving the production web build from one origin, and DATABASE_URL set:
 *
 *   nx run web:build:production
 *   WEB_DIST=dist/apps/web/browser PORT=3000 PUBLIC_ORIGIN=http://localhost:3000 bun apps/api/src/main.dev.ts
 *
 * Signs in as the dev player, creates a throwaway level 1 character unless `--character` names one, then runs
 * `lhci collect` over both pages with the session cookie, `lhci assert` against the budgets, and `lhci upload` to
 * `tmp/lhci`. The results are written, as the bench suite writes its own, before the budgets fail the run, so the
 * history still records a regression. Request counts and transfer sizes repeat from run to run; LCP is simulated but
 * still moves a little with the machine.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { SQL } from 'bun';
import { chromium } from 'playwright';

import { createCharacter, signIn } from './dev-session.ts';
import {
  LighthouseReportSchema,
  ManifestSchema,
  pageName,
  representativeReports,
  toMarkdownTable,
  toPageResult,
  toTrackerEntries,
} from './page-budget-report.ts';
import type { PageResult } from './page-budget-report.ts';

const DEFAULT_OUT = 'tmp/page-budget-results.json';
const DEFAULT_SUMMARY = 'tmp/page-budget-summary.md';
const LHCI_DIR = 'tmp/lhci';
const LHCI_BIN = 'node_modules/.bin/lhci';

const { values } = parseArgs({
  options: {
    web: { type: 'string', default: `http://localhost:${Bun.env['API_PORT'] ?? '3000'}` },
    api: { type: 'string', default: `http://localhost:${Bun.env['API_PORT'] ?? '3000'}` },
    character: { type: 'string' },
    out: { type: 'string', default: DEFAULT_OUT },
    summary: { type: 'string', default: DEFAULT_SUMMARY },
  },
});

const { web, api, out, summary } = values;

const databaseUrl = Bun.env['DATABASE_URL'];

if (databaseUrl === undefined) {
  throw new Error('DATABASE_URL is not set; run this in the devshell');
}

const db = new SQL(databaseUrl);
const cookie = await signIn(api);
const characterId = values.character ?? (await createCharacter({ api, cookie }, db, 'Page Budget'));

await db.close();

/** Runs one lhci command with Playwright's Chromium, as the bench suite does not need a browser of its own. */
async function lhci(args: readonly string[]): Promise<number> {
  const child = Bun.spawn([LHCI_BIN, ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...Bun.env, CHROME_PATH: chromium.executablePath() },
  });

  return child.exited;
}

const healthy = await lhci(['healthcheck', '--fatal']);

if (healthy !== 0) {
  throw new Error('lhci cannot start; is Chromium available?');
}

const collected = await lhci([
  'collect',
  `--url=${web}/characters`,
  `--url=${web}/characters/${characterId}`,
  `--settings.extraHeaders=${JSON.stringify({ Cookie: cookie })}`,
]);

if (collected !== 0) {
  throw new Error('lhci collect failed');
}

const asserted = await lhci(['assert']);

const uploaded = await lhci(['upload']);

if (uploaded !== 0) {
  throw new Error('lhci upload failed');
}

const manifestText = await readFile(path.join(LHCI_DIR, 'manifest.json'), 'utf8');
const manifest = ManifestSchema.parse(JSON.parse(manifestText));

const results: PageResult[] = [];

for (const reportPath of representativeReports(manifest)) {
  // oxlint-disable-next-line eslint/no-await-in-loop
  const reportText = await readFile(reportPath, 'utf8');
  const report = LighthouseReportSchema.parse(JSON.parse(reportText));

  results.push(toPageResult(pageName(report.finalDisplayedUrl, characterId), report));
}

const table = toMarkdownTable(results);

await mkdir(path.dirname(out), { recursive: true });

const entries = toTrackerEntries(results);

await writeFile(out, `${JSON.stringify(entries, undefined, 2)}\n`);

await writeFile(summary, `${table}\n`);

console.info(table);

if (asserted !== 0) {
  console.error('A page is over its budget; see the lhci assert output above.');
  process.exitCode = 1;
}
