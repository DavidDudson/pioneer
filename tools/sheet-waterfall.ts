/**
 * Measures what opening a character sheet costs in a real browser, cold and warm, so a change can be shown with a
 * before and an after.
 *
 *   bun tools/sheet-waterfall.ts [--web http://localhost:4200] [--api http://localhost:3000] [--character <id>]
 *     [--runs 5] [--out tmp/sheet-waterfall.json]
 *
 * Needs the dev stack running (`just dev`) and DATABASE_URL set, as `perf-probe.ts` does. Signs in as the dev player,
 * creates a throwaway level 1 character unless `--character` names one, then opens its sheet `--runs` times in a fresh
 * browser context (cold: no HTTP cache, no IndexedDB) and reloads it in that context (warm). Each load waits for the
 * sheet's `sheet:ready` mark and reports the requests it made with when each started and ended, their bytes, and the
 * time to the `sheet:header` and `sheet:ready` marks. Timings depend on the machine and on the dev server, which
 * serves unbundled and uncompressed: compare runs from the same stack, and trust the request counts more than the
 * milliseconds.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { SQL } from 'bun';
import { chromium } from 'playwright';
import type { Page } from 'playwright';

import { createCharacter, signIn } from './dev-session.ts';
import { summarise, waterfallTable } from './sheet-waterfall-stats.ts';
import type { SheetLoad, WaterfallRow } from './sheet-waterfall-stats.ts';

const DEFAULT_RUNS = 5;
const DEFAULT_OUT = 'tmp/sheet-waterfall.json';
const READY_TIMEOUT_MS = 60_000;
/** How long the cold load gets, once the network is quiet, to finish keeping its bundles in IndexedDB. */
const STORE_SETTLE_MS = 2000;
const HEADER_MARK = 'sheet:header';
const READY_MARK = 'sheet:ready';
/** What the web app's requests to the API start with; its scripts, styles and fonts are not part of the count. */
const RESOURCE_BUFFER = 10_000;
const API_PREFIX = '/api/';

const { values } = parseArgs({
  options: {
    web: { type: 'string', default: `http://localhost:${Bun.env['WEB_PORT'] ?? '4200'}` },
    api: { type: 'string', default: `http://localhost:${Bun.env['API_PORT'] ?? '3000'}` },
    character: { type: 'string' },
    runs: { type: 'string', default: String(DEFAULT_RUNS) },
    out: { type: 'string', default: DEFAULT_OUT },
  },
});
const { web, api, out } = values;
const runs = Number(values.runs);

const databaseUrl = Bun.env['DATABASE_URL'];
if (databaseUrl === undefined) {
  throw new Error('DATABASE_URL is not set; run this in the devshell');
}
const db = new SQL(databaseUrl);

interface Timed {
  readonly rows: readonly WaterfallRow[];
  readonly marks: Readonly<Record<string, number>>;
}

/** The page's own record of the load: the fetches it made and its paint marks, in ms from the start of navigation. */
async function readLoad(page: Page): Promise<Timed> {
  await page.waitForFunction((mark) => performance.getEntriesByName(mark).length > 0, READY_MARK, {
    timeout: READY_TIMEOUT_MS,
  });
  return page.evaluate(
    ([marks, apiPrefix]): Timed => ({
      rows: performance
        .getEntriesByType('resource')
        .filter((entry) => new URL(entry.name).pathname.startsWith(apiPrefix))
        .map((entry) => ({
          name: new URL(entry.name).pathname,
          startMs: entry.startTime,
          endMs: entry.startTime + entry.duration,
          bytes: (entry as PerformanceResourceTiming).transferSize,
        })),
      marks: Object.fromEntries(marks.map((mark) => [mark, performance.getEntriesByName(mark)[0]?.startTime ?? 0])),
    }),
    [[HEADER_MARK, READY_MARK], API_PREFIX] as const,
  );
}

function loadOf({ rows, marks }: Timed): SheetLoad {
  return { rows, headerMs: marks[HEADER_MARK] ?? 0, readyMs: marks[READY_MARK] ?? 0 };
}

const cookie = await signIn(api);
const characterId = values.character ?? (await createCharacter({ api, cookie }, db, 'Sheet Waterfall'));
const [cookieName, cookieValue] = cookie.split('=');
const browser = await chromium.launch();
const cold: SheetLoad[] = [];
const warm: SheetLoad[] = [];
for (let run = 0; run < runs; run += 1) {
  // A new context each run is what makes the load cold: it has no HTTP cache and no IndexedDB.
  // oxlint-disable-next-line eslint/no-await-in-loop
  const context = await browser.newContext();
  // The dev server sends hundreds of script chunks, which would fill the default buffer before the API calls land.
  // oxlint-disable-next-line eslint/no-await-in-loop
  await context.addInitScript((size) => {
    performance.setResourceTimingBufferSize(size);
  }, RESOURCE_BUFFER);
  // oxlint-disable-next-line eslint/no-await-in-loop
  await context.addCookies([{ name: cookieName ?? '', value: cookieValue ?? '', url: web }]);
  // oxlint-disable-next-line eslint/no-await-in-loop
  const page = await context.newPage();
  // oxlint-disable-next-line eslint/no-await-in-loop
  await page.goto(`${web}/characters/${characterId}`);
  // oxlint-disable-next-line eslint/no-await-in-loop
  cold.push(loadOf(await readLoad(page)));
  // A visit later: the idle prefetch and the writes to IndexedDB have finished, as they would by the next visit.
  // oxlint-disable-next-line eslint/no-await-in-loop
  await page.waitForLoadState('networkidle');
  // oxlint-disable-next-line eslint/no-await-in-loop
  await page.waitForTimeout(STORE_SETTLE_MS);
  // oxlint-disable-next-line eslint/no-await-in-loop
  await page.reload();
  // oxlint-disable-next-line eslint/no-await-in-loop
  warm.push(loadOf(await readLoad(page)));
  // oxlint-disable-next-line eslint/no-await-in-loop
  await context.close();
}
await browser.close();
await db.close();

const report = { runs, characterId, cold: summarise(cold), warm: summarise(warm) };
for (const [label, summary] of [
  ['cold', report.cold],
  ['warm', report.warm],
] as const) {
  console.info(
    `${label}: ${summary.requests} requests, ${summary.bytes} B, header ${summary.headerMs} ms, ready ${summary.readyMs} ms (median of ${summary.runs})`,
  );
  console.info(waterfallTable(summary.waterfall));
}
await mkdir(path.dirname(out), { recursive: true });
await Bun.write(out, `${JSON.stringify(report, undefined, 2)}\n`);
