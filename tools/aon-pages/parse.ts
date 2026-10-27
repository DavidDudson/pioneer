/**
 * Reads one answer of AoN's search index (ADR-0073): the hits for a book, each with an entry `url` and a
 * `source_markdown` such as `[Player Core](/Sources.aspx?ID=216) pg. 331`. Only the entry's URL, its name and type, and
 * the page it has in the asked book are kept; every other field is ignored. A hit that is not one entry, or has no page in the book, is
 * counted apart so the run can report it.
 */
import { AonListedEntry, AonUrl, PageNumber } from '@pioneer/rules/sdk';
import * as z from 'zod';

const ORIGIN = 'https://2e.aonprd.com';
const PAGE = /\]\(\/Sources\.aspx\?ID=(?<id>\d+)\)\s*pg\.\s*(?<page>\d+)/gu;

const Source = z.object({
  url: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  source_markdown: z.string().optional(),
});
const Hits = z.object({ total: z.object({ value: z.number() }), hits: z.array(z.object({ _source: Source })) });
const Answer = z.object({ hits: Hits });

/** What one answer held. */
export interface PageHits {
  readonly total: number;
  readonly count: number;
  readonly pages: ReadonlyMap<AonUrl, PageNumber>;
  /** Every hit that is one named entry, with or without a page. */
  readonly entries: readonly AonListedEntry[];
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

/** What one hit gives: its URL if it is one entry's, the entry if it is named, and its page in the asked book. */
interface ReadHit {
  readonly url: AonUrl | undefined;
  readonly entry: AonListedEntry | undefined;
  readonly page: PageNumber | undefined;
}

function readHit(source: z.infer<typeof Source>, sourceId: string): ReadHit {
  const { data: url } = AonUrl.safeParse(`${ORIGIN}${source.url}`);
  const { data: entry } = AonListedEntry.safeParse({ type: source.type, name: source.name, url });
  return { url, entry, page: pageIn(source.source_markdown ?? '', sourceId) };
}

export function parseHits(json: unknown, sourceId: string): PageHits {
  const { hits } = Answer.parse(json);
  const pages = new Map<AonUrl, PageNumber>();
  const entries: AonListedEntry[] = [];
  let skipped = 0;
  for (const { _source: source } of hits.hits) {
    const { url, entry, page } = readHit(source, sourceId);
    entries.push(...(entry === undefined ? [] : [entry]));
    if (url !== undefined && page !== undefined) {
      pages.set(url, page);
    } else {
      skipped += 1;
    }
  }
  return { total: hits.total.value, count: hits.hits.length, pages, entries, skipped };
}
