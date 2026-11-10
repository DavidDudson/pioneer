/** The arithmetic of `tools/sheet-waterfall.ts`, apart from the browser so a spec can hold it. */

const HALF = 0.5;
const DECIMALS = 10;

/** One request of a page load, in milliseconds from the start of navigation. */
export interface WaterfallRow {
  readonly name: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly bytes: number;
}

/** One page load: what it fetched and when the sheet's two paint marks were set. */
export interface SheetLoad {
  readonly rows: readonly WaterfallRow[];
  readonly headerMs: number;
  readonly readyMs: number;
}

/** What a set of runs of one kind of load comes to: the medians, and the run nearest them, for its waterfall. */
export interface LoadSummary {
  readonly runs: number;
  readonly requests: number;
  readonly bytes: number;
  readonly headerMs: number;
  readonly readyMs: number;
  readonly waterfall: readonly WaterfallRow[];
}

function rounded(value: number): number {
  return Math.round(value * DECIMALS) / DECIMALS;
}

/** The middle of `values`; the mean of the two middle ones when there are an even number. */
export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = values.toSorted((left, right) => left - right);
  const upper = Math.floor(sorted.length * HALF);
  const high = sorted[upper] ?? 0;
  const low = sorted[sorted.length % 2 === 0 ? upper - 1 : upper] ?? 0;
  return (low + high) * HALF;
}

function totalBytes(load: SheetLoad): number {
  return load.rows.reduce((total, row) => total + row.bytes, 0);
}

/** Summarises `loads`; the waterfall shown is that of the load whose time to ready is nearest the median. */
export function summarise(loads: readonly SheetLoad[]): LoadSummary {
  const readyMs = median(loads.map((load) => load.readyMs));
  const [nearest] = loads.toSorted(
    (left, right) => Math.abs(left.readyMs - readyMs) - Math.abs(right.readyMs - readyMs),
  );
  return {
    runs: loads.length,
    requests: median(loads.map((load) => load.rows.length)),
    bytes: median(loads.map((load) => totalBytes(load))),
    headerMs: rounded(median(loads.map((load) => load.headerMs))),
    readyMs: rounded(readyMs),
    waterfall: nearest?.rows.toSorted((left, right) => left.startMs - right.startMs) ?? [],
  };
}

const BUNDLE_PATH = '/api/content/bundles/';

/** Joins the content bundle files, a hundred or more a load, into one row: when the first started, the last ended. */
export function groupBundles(rows: readonly WaterfallRow[]): readonly WaterfallRow[] {
  const bundles = rows.filter((row) => row.name.startsWith(BUNDLE_PATH));
  if (bundles.length === 0) {
    return rows;
  }
  const grouped: WaterfallRow = {
    name: `${BUNDLE_PATH}* (${bundles.length} files)`,
    startMs: Math.min(...bundles.map((row) => row.startMs)),
    endMs: Math.max(...bundles.map((row) => row.endMs)),
    bytes: bundles.reduce((total, row) => total + row.bytes, 0),
  };
  return [...rows.filter((row) => !row.name.startsWith(BUNDLE_PATH)), grouped].toSorted(
    (left, right) => left.startMs - right.startMs,
  );
}

/** The waterfall as a Markdown table, in start order, each request with the time it started and ended. */
export function waterfallTable(rows: readonly WaterfallRow[]): string {
  const lines = groupBundles(rows).map(
    (row) => `| ${row.name} | ${rounded(row.startMs)} | ${rounded(row.endMs)} | ${row.bytes} |`,
  );
  return ['| Request | Start (ms) | End (ms) | Bytes |', '| --- | ---: | ---: | ---: |', ...lines].join('\n');
}
