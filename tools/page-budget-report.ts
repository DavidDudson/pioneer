/**
 * What `bun run perf:pages` does with the Lighthouse results it collected: reads the median run of each page out of
 * the lhci manifest, shapes the numbers for `benchmark-action/github-action-benchmark` (`customSmallerIsBetter`) and
 * writes the table the job summary shows.
 */
import * as z from 'zod';

const BYTES_PER_KB = 1024;

const TotalRowSchema = z.object({
  resourceType: z.string(),
  requestCount: z.number(),
  transferSize: z.number(),
});

const ResourceSummarySchema = z.object({ details: z.object({ items: z.array(TotalRowSchema) }) });
const LcpSchema = z.object({ numericValue: z.number() });
const AuditsSchema = z.object({ 'largest-contentful-paint': LcpSchema, 'resource-summary': ResourceSummarySchema });

/** The part of a Lighthouse report this check reads: the page's LCP and its total request count and transfer. */
export const LighthouseReportSchema = z.object({ finalDisplayedUrl: z.string(), audits: AuditsSchema });

const ManifestRunSchema = z.object({ jsonPath: z.string(), isRepresentativeRun: z.boolean() });

/** The lhci manifest: one row per Lighthouse run, the median run of each page marked representative. */
export const ManifestSchema = z.array(ManifestRunSchema);

export type LighthouseReport = z.infer<typeof LighthouseReportSchema>;

export type Manifest = z.infer<typeof ManifestSchema>;

/** What one page costs to open. */
export interface PageResult {
  readonly page: string;
  readonly requests: number;
  readonly transferKb: number;
  readonly lcpMs: number;
}

/** One entry of the tracker's JSON. `extra` shows beside the value in a chart's tooltip. */
export interface TrackerEntry {
  readonly name: string;
  readonly unit: string;
  readonly value: number;
  readonly extra: string;
}

/** The result of one Lighthouse report, named `page`; throws when the report has no total row. */
export function toPageResult(page: string, { audits }: LighthouseReport): PageResult {
  const total = audits['resource-summary'].details.items.find((row) => row.resourceType === 'total');

  if (total === undefined) {
    throw new Error(`The report for ${page} has no total row in its resource summary`);
  }

  return {
    page,
    requests: total.requestCount,
    transferKb: Math.round(total.transferSize / BYTES_PER_KB),
    lcpMs: Math.round(audits['largest-contentful-paint'].numericValue),
  };
}

/** The paths of the manifest's representative (median) runs, in the order lhci wrote them. */
export function representativeReports(manifest: Manifest): string[] {
  return manifest.filter((run) => run.isRepresentativeRun).map((run) => run.jsonPath);
}

/**
 * The page a report was taken of: its URL's path. The throwaway sheet's id is made generic, and the tab the sheet
 * redirects to (`/exploration/roleplay`) is dropped, so the name stays the same from run to run.
 */
export function pageName(finalDisplayedUrl: string, characterId: string): string {
  const { pathname } = new URL(finalDisplayedUrl);

  return pathname.startsWith(`/characters/${characterId}`) ? '/characters/:id' : pathname;
}

/** Throws when Lighthouse ended up away from the app's pages (a rejected session lands on the sign-in page). */
export function assertOnApp(finalDisplayedUrl: string): void {
  const { pathname } = new URL(finalDisplayedUrl);

  if (!pathname.startsWith('/characters')) {
    throw new Error(`Lighthouse measured ${pathname}, not a character page; is the dev session accepted?`);
  }
}

/** Throws unless every page asked for has a result, so a page that dropped out cannot pass unnoticed. */
export function assertPagesMeasured(results: readonly PageResult[], expected: number): void {
  if (results.length !== expected) {
    throw new Error(`Expected ${expected} measured pages, got ${results.length}`);
  }
}

/** Three entries per page, so each metric has its own chart, unit and trend. */
export function toTrackerEntries(results: readonly PageResult[]): TrackerEntry[] {
  return results.flatMap(({ page, requests, transferKb, lcpMs }) => [
    { name: `page ${page}: requests`, unit: 'requests', value: requests, extra: 'all resources, desktop preset' },
    { name: `page ${page}: transfer`, unit: 'KB', value: transferKb, extra: 'transfer size of all resources' },
    { name: `page ${page}: LCP`, unit: 'ms', value: lcpMs, extra: 'median of the Lighthouse runs, simulated' },
  ]);
}

/** A Markdown table of the results, for the job summary. */
export function toMarkdownTable(results: readonly PageResult[]): string {
  const rows = results.map(
    ({ page, requests, transferKb, lcpMs }) => `| ${page} | ${requests} | ${transferKb} | ${lcpMs} |`,
  );

  return ['| Page | Requests | Transfer (KB) | LCP (ms) |', '| --- | ---: | ---: | ---: |', ...rows].join('\n');
}
