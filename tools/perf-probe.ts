/**
 * Measures what opening a character sheet costs the API, so a change can be shown with a before and an after.
 *
 *   bun tools/perf-probe.ts [--api http://localhost:3000] [--character <id>] [--runs 20] [--out tmp/perf-probe.json]
 *     [--pg-log .data/postgres.log]
 *
 * Needs the dev API running (`just dev`, or `bun apps/api/src/main.dev.ts`) and DATABASE_URL set. Signs in as the dev
 * player, creates a throwaway level 1 character unless `--character` names one (use that for a big build), then calls
 * each endpoint the sheet loads `--runs` times, one at a time. Per endpoint it reports the median and p95 time, the body
 * size, whether it was compressed, and the SQL statements per call (counted in the Postgres log, which the probe turns
 * on with `alter system set log_statement` and back off; nothing else may use the database meanwhile). Last it fires the set at
 * once, as the browser does, for the wall time of a sheet load. Timings depend on the machine: compare runs from the
 * same one, and trust the counts and sizes more than the milliseconds.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { SQL } from 'bun';

const DEFAULT_RUNS = 20;
const DEFAULT_OUT = 'tmp/perf-probe.json';
const DEV_PLAYER_ID = '00000000-0000-4000-8000-00000000de02';
const MEDIAN = 0.5;
const P95 = 0.95;
const DECIMALS = 100;
const SETTLE_MS = 300;
const STATEMENT_LINE = /LOG: {2}(?:statement|execute [^:]*): /u;
const OK = 200;

const SHEET_ENDPOINTS: readonly string[] = [
  '',
  '/play',
  '/sheet-mode',
  '/feat-display',
  '/allies',
  '/packs',
  '/rule-limits',
  '/rule-limit-settings',
  '/item-approvals',
  '/variant-rules',
  '/unenabled-content',
];

const { values } = parseArgs({
  options: {
    api: { type: 'string', default: `http://localhost:${Bun.env['API_PORT'] ?? '3000'}` },
    character: { type: 'string' },
    runs: { type: 'string', default: String(DEFAULT_RUNS) },
    out: { type: 'string', default: DEFAULT_OUT },
    'pg-log': { type: 'string', default: '.data/postgres.log' },
  },
});

const { api } = values;
const runs = Number(values.runs);
const { 'pg-log': pgLog } = values;
const databaseUrl = Bun.env['DATABASE_URL'];
if (databaseUrl === undefined) {
  throw new Error('DATABASE_URL is not set; run this in the devshell');
}
const db = new SQL(databaseUrl);
const origin = Bun.env['PUBLIC_ORIGIN'] ?? 'http://localhost:4200';
const writeHeaders = { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };

interface Measure {
  readonly path: string;
  readonly status: number;
  readonly bytes: number;
  readonly encoding: string;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly statements: number;
}

interface WholeLoad {
  readonly requests: number;
  readonly bytes: number;
  readonly wallMs: number;
  readonly statements: number;
}

function rounded(value: number): number {
  return Math.round(value * DECIMALS) / DECIMALS;
}

function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

/** How far the Postgres log has grown; what is logged after this point is what ran since. */
async function logMark(): Promise<number> {
  await Bun.sleep(SETTLE_MS);
  return Bun.file(pgLog).size;
}

/** The statements logged since `mark`, simple and extended protocol alike. */
async function statementsSince(mark: number): Promise<number> {
  await Bun.sleep(SETTLE_MS);
  const added = await Bun.file(pgLog).slice(mark).text();
  return added.split('\n').filter((line) => STATEMENT_LINE.test(line)).length;
}

async function signIn(): Promise<string> {
  const response = await fetch(`${api}/api/auth/dev/${DEV_PLAYER_ID}`, {
    redirect: 'manual',
    headers: { 'sec-fetch-site': 'same-origin' },
  });
  const cookie = response.headers.getSetCookie()[0]?.split(';')[0];
  if (cookie === undefined) {
    throw new Error(`Dev sign-in failed with ${response.status}; is the API running with the dev entrypoint?`);
  }
  return cookie;
}

async function createCharacter(cookie: string): Promise<string> {
  const [ancestry] = await db<
    { readonly id: string }[]
  >`select id from content_entries where kind = 'ancestry' limit 1`;
  const response = await fetch(`${api}/api/characters`, {
    method: 'POST',
    headers: { ...writeHeaders, cookie },
    body: JSON.stringify({ name: 'Perf Probe', ancestry: ancestry?.id }),
  });
  const created = (await response.json()) as { readonly id: string };
  return created.id;
}

interface Timed {
  readonly status: number;
  readonly bytes: number;
  readonly encoding: string;
  readonly ms: number;
}

async function timed(url: string, headers: Record<string, string>): Promise<Timed> {
  const start = performance.now();
  const response = await fetch(url, { headers });
  const body = await response.arrayBuffer();
  return {
    status: response.status,
    bytes: body.byteLength,
    encoding: response.headers.get('content-encoding') ?? 'none',
    ms: performance.now() - start,
  };
}

async function measure(cookie: string, characterId: string, suffix: string): Promise<Measure> {
  const url = `${api}/api/characters/${characterId}${suffix}`;
  const headers = { cookie, 'accept-encoding': 'gzip, br' };
  const calls: Timed[] = [];
  const before = await logMark();
  for (let run = 0; run < runs; run += 1) {
    // Sequential on purpose: parallel calls would time each other.
    // oxlint-disable-next-line eslint/no-await-in-loop
    calls.push(await timed(url, headers));
  }
  const statements = await statementsSince(before);
  const sorted = calls.map(({ ms }) => ms).toSorted((left, right) => left - right);
  const [last] = calls.slice(-1);
  return {
    path: suffix === '' ? '/characters/:id' : suffix,
    status: last?.status ?? 0,
    bytes: last?.bytes ?? 0,
    encoding: last?.encoding ?? 'none',
    medianMs: rounded(percentile(sorted, MEDIAN)),
    p95Ms: rounded(percentile(sorted, P95)),
    statements: rounded(statements / runs),
  };
}

async function wholeLoad(cookie: string, characterId: string): Promise<WholeLoad> {
  const before = await logMark();
  const start = performance.now();
  const bodies = await Promise.all(
    SHEET_ENDPOINTS.map(async (suffix) => {
      const { bytes } = await timed(`${api}/api/characters/${characterId}${suffix}`, { cookie });
      return bytes;
    }),
  );
  const wallMs = performance.now() - start;
  const after = await statementsSince(before);
  return {
    requests: bodies.length,
    bytes: bodies.reduce((total, size) => total + size, 0),
    wallMs: rounded(wallMs),
    statements: after,
  };
}

await db.unsafe("alter system set log_statement = 'all'");
await db`select pg_reload_conf()`;
const cookie = await signIn();
const characterId = values.character ?? (await createCharacter(cookie));
const endpoints: Measure[] = [];
for (const suffix of SHEET_ENDPOINTS) {
  // oxlint-disable-next-line eslint/no-await-in-loop
  endpoints.push(await measure(cookie, characterId, suffix));
}
const failed = endpoints.filter(({ status }) => status !== OK);
const sheet = await wholeLoad(cookie, characterId);
const manifest = await fetch(`${api}/api/content/manifest`, { headers: { 'accept-encoding': 'gzip, br' } });
const manifestBody = await manifest.arrayBuffer();
const manifestBytes = manifestBody.byteLength;
const report = {
  runs,
  characterId,
  sheet,
  endpoints,
  manifest: {
    bytes: manifestBytes,
    encoding: manifest.headers.get('content-encoding') ?? 'none',
    cacheControl: manifest.headers.get('cache-control'),
    etag: manifest.headers.get('etag'),
  },
};

console.table(endpoints);
console.info(
  `sheet load: ${sheet.requests} requests, ${sheet.bytes} B, ${sheet.wallMs} ms wall, ${sheet.statements} statements`,
);
console.info(
  `manifest: ${manifestBytes} B, ${report.manifest.encoding}, ${report.manifest.cacheControl ?? 'no cache-control'}`,
);

const { out } = values;
await mkdir(path.dirname(out), { recursive: true });
await Bun.write(out, `${JSON.stringify(report, undefined, 2)}\n`);
await db.unsafe('alter system reset log_statement');
await db`select pg_reload_conf()`;
await db.close();
if (failed.length > 0) {
  console.error(`Not 200: ${failed.map(({ path: failedPath, status }) => `${failedPath} ${status}`).join(', ')}`);
  process.exitCode = 1;
}
