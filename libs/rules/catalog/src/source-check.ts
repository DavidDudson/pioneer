import { contentKey, RulesMessage, SourceKind } from '@pioneer/rules/sdk';
import type { ContentKey, ContentPack, PackId, Slug, SourceRef } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import type { BookRegistry } from './book-registry';

/** What the source checks read from an entry: where it lives and what it cites. */
export interface SourcedEntry {
  readonly pack: PackId;
  readonly slug: Slug;
  readonly sources: readonly SourceRef[];
}

/**
 * The checks on an entry's sources that need the book registry (content-model.md, "Books and source references"):
 * every book source names a registered book, and a homebrew source names the entry's own pack. The schema has
 * already checked each source's shape. Paths start at the entry.
 */
export function sourceIssues(entry: SourcedEntry, registry: BookRegistry): readonly FieldIssue[] {
  const key = contentKey(entry.pack, entry.slug);
  return entry.sources.flatMap((source, index): FieldIssue[] => {
    if (source.kind === SourceKind.Book && registry.book(source.book) === undefined) {
      const params = { entry: key, index, book: source.book };
      return [{ path: ['sources', index, 'book'], message: message(RulesMessage.SourceUnknownBook, params) }];
    }
    if (source.kind === SourceKind.Homebrew && source.pack !== entry.pack) {
      const params = { entry: key, index, pack: entry.pack, sourcePack: source.pack };
      return [{ path: ['sources', index, 'pack'], message: message(RulesMessage.SourceHomebrewPack, params) }];
    }
    return [];
  });
}

/** Every entry in `pack`, as the source checks read it. */
export function packEntries(pack: ContentPack): readonly SourcedEntry[] {
  return [...pack.ancestries, ...pack.creatures, ...pack.statistics].map(({ slug, sources }) => ({
    pack: pack.id,
    slug,
    sources,
  }));
}

/** An entry whose sources the registry rejects. */
export interface MissourcedEntry {
  readonly entry: ContentKey;
  readonly issues: readonly FieldIssue[];
}

/** Thrown when a pack cites sources the book registry rejects. */
export class SourceCheckError extends Error {
  public readonly entries: readonly MissourcedEntry[];

  public constructor(pack: PackId, entries: readonly MissourcedEntry[]) {
    super(`Pack "${pack}" cites sources the book registry rejects: ${JSON.stringify(entries)}`);
    this.name = 'SourceCheckError';
    this.entries = entries;
  }
}

/** `pack`, once every entry's sources pass the registry checks; throws `SourceCheckError` otherwise. */
export function checkPackSources(pack: ContentPack, registry: BookRegistry): ContentPack {
  const missourced = packEntries(pack).flatMap((entry): MissourcedEntry[] => {
    const issues = sourceIssues(entry, registry);
    return issues.length > 0 ? [{ entry: contentKey(entry.pack, entry.slug), issues }] : [];
  });
  if (missourced.length > 0) {
    throw new SourceCheckError(pack.id, missourced);
  }
  return pack;
}
