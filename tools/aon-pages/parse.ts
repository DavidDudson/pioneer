/**
 * Reads one answer of AoN's search index (ADR-0073): the hits for a book, each with an entry `url` and a
 * `source_markdown` such as `[Player Core](/Sources.aspx?ID=216) pg. 331`. Only the entry's URL and the page it has in
 * the asked book are kept; every other field is ignored. A hit that is not one entry, or has no page in the book, is
 * counted apart so the run can report it.
 */
import { AonUrl, PageNumber } from '@pioneer/rules/sdk';
import * as z from 'zod';

const ORIGIN = 'https://2e.aonprd.com';
const PAGE = /\]\(\/Sources\.aspx\?ID=(?<id>\d+)\)\s*pg\.\s*(?<page>\d+)/gu;

const Source = z.object({ url: z.string(), source_markdown: z.string().optional() });
const Hits = z.object({ total: z.object({ value: z.number() }), hits: z.array(z.object({ _source: Source })) });
const Answer = z.object({ hits: Hits });

/** What one answer held. */
export interface PageHits {
  readonly total: number;
  readonly count: number;
  readonly pages: ReadonlyMap<AonUrl, PageNumber>;
  readonly skipped: number;
}

/** The first page `markdown` prints for the book whose Sources page has `sourceId`. */
export function pageIn(markdown: string, sourceId: string): PageNumber | undefined {
  for (const { groups } of markdown.matchAll(PAGE)) {
    const parsed = PageNumber.safeParse(Number(groups?.['page']));
    if (groups?.['id'] === sourceId && parsed.success) {
      return parsed.data;
    }
  }
  return undefined;
}

export function parseHits(json: unknown, sourceId: string): PageHits {
  const { hits } = Answer.parse(json);
  const pages = new Map<AonUrl, PageNumber>();
  let skipped = 0;
  for (const { _source: source } of hits.hits) {
    const url = AonUrl.safeParse(`${ORIGIN}${source.url}`);
    const page = pageIn(source.source_markdown ?? '', sourceId);
    if (url.success && page !== undefined) {
      pages.set(url.data, page);
    } else {
      skipped += 1;
    }
  }
  return { total: hits.total.value, count: hits.hits.length, pages, skipped };
}
