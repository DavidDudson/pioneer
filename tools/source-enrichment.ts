/**
 * The source pass over committed packs (content-model.md, "Books and source references"; ADR-0070, ADR-0071): each
 * entry with an applicable enrichment mapping gets the mapping's page and AoN URL on its book source for that book. A
 * value already on the source is never replaced. Only that source changes: the entry's other fields keep their JSON
 * as is, with no re-encoding, so the diff holds nothing else.
 */
import { ContentEntryFile, SourceKind } from '@pioneer/rules/sdk';
import type { ContentEntry, EnrichmentMapping, EntrySlug, SourceRef } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** What filling one entry set: the index of its book source, the values to add, and how many pages and URLs that is. */
interface Fill {
  readonly index: number;
  readonly values: { readonly page?: number; readonly aon?: string };
  readonly pages: number;
  readonly aons: number;
}

/** The mapping's page and AoN URL that the entry's source for its book lacks; undefined if no source cites that book. */
function fill(sources: readonly SourceRef[], { book, page, aon }: EnrichmentMapping): Fill | undefined {
  const index = sources.findIndex((source) => source.kind === SourceKind.Book && source.book === book);
  const source = sources[index];
  if (source?.kind !== SourceKind.Book) {
    return undefined;
  }
  const setPage = source.page === undefined && page !== undefined;
  const setAon = source.aon === undefined && aon !== undefined;
  const values = { ...(setPage ? { page } : {}), ...(setAon ? { aon } : {}) };
  return { index, values, pages: Number(setPage), aons: Number(setAon) };
}

/** An entry's raw JSON and its sources, as records so every key keeps its place. */
const SOURCES = 'sources';
const RawEntry = z.record(z.string(), z.unknown());
const RawSources = z.array(z.record(z.string(), z.unknown())).readonly();

/** The raw entry with `values` added to its source at `index`; every other field is as it was. */
function patch(json: unknown, { index, values }: Fill): unknown {
  const raw = RawEntry.parse(json);
  const sources = RawSources.parse(raw[SOURCES]);
  return { ...raw, sources: sources.with(index, { ...sources[index], ...values }) };
}

/** What the pass did to one entry: its JSON, what it set, and whether its mapping's book is one it cites. */
interface EntryResult {
  readonly json: unknown;
  readonly pages: number;
  readonly aons: number;
  readonly uncited: boolean;
}

function enrichEntry(
  json: unknown,
  entry: ContentEntry | undefined,
  mapping: EnrichmentMapping | undefined,
): EntryResult {
  const unchanged = { json, pages: 0, aons: 0, uncited: false };
  if (entry === undefined || mapping === undefined) {
    return unchanged;
  }
  const filled = fill(entry.sources, mapping);
  if (filled === undefined) {
    return { ...unchanged, uncited: true };
  }
  const { pages, aons } = filled;
  return pages + aons === 0 ? unchanged : { ...unchanged, json: patch(json, filled), pages, aons };
}

/** What the pass did to a `<kind>.json` file. `json` is undefined when no entry changed. */
export interface EnrichedFile {
  readonly json: readonly unknown[] | undefined;
  readonly pages: number;
  readonly aons: number;
  /** Slugs whose mapping names a book the entry doesn't cite, so nothing was applied. */
  readonly uncited: readonly EntrySlug[];
}

/** A `<kind>.json` file with each mapped entry's page and AoN URL set. Entries the pass doesn't change are untouched. */
export function enrichSourcesFile(
  file: readonly unknown[],
  mappings: ReadonlyMap<EntrySlug, EnrichmentMapping>,
): EnrichedFile {
  const entries = ContentEntryFile.parse(file);
  const results = file.map((json, index) => {
    const entry = entries[index];
    return {
      slug: entry?.slug,
      ...enrichEntry(json, entry, entry === undefined ? undefined : mappings.get(entry.slug)),
    };
  });
  const pages = results.reduce((sum, result) => sum + result.pages, 0);
  const aons = results.reduce((sum, result) => sum + result.aons, 0);
  const uncited = results.flatMap(({ slug, uncited: flagged }) => (flagged && slug !== undefined ? [slug] : []));
  return { json: pages + aons > 0 ? results.map((result) => result.json) : undefined, pages, aons, uncited };
}
