import { contentKey, EntrySlug, RulesMessage } from '@pioneer/rules/sdk';
import type { EnrichmentMapping, EnrichmentMappingFile, PackId } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import type { BookRegistry } from './book-registry';

/** What a mapping file is checked against: the pack it enriches, that pack's entries and the book registry. */
export interface EnrichmentTarget {
  readonly pack: PackId;
  readonly slugs: ReadonlySet<EntrySlug>;
  readonly registry: BookRegistry;
}

/** What checking a mapping file leaves: the mappings to apply, and a report of the rest. */
export interface EnrichmentCheck {
  readonly applicable: ReadonlyMap<EntrySlug, EnrichmentMapping>;
  readonly issues: readonly FieldIssue[];
}

/**
 * The checks on a mapping file that need the pack and the book registry (ADR-0070): a mapping that names an unknown
 * slug or book is reported and not applied. The schema has already checked each mapping's shape. Paths start at the
 * slug.
 */
export function checkEnrichment(
  mapping: EnrichmentMappingFile,
  { pack, slugs, registry }: EnrichmentTarget,
): EnrichmentCheck {
  const applicable = new Map<EntrySlug, EnrichmentMapping>();
  const issues: FieldIssue[] = [];
  for (const [key, entry] of Object.entries(mapping)) {
    const slug = EntrySlug.parse(key);
    if (!slugs.has(slug)) {
      const params = { pack, slug, entry: contentKey(pack, slug) };
      issues.push({ path: [slug], message: message(RulesMessage.EnrichmentUnknownSlug, params) });
    } else if (registry.book(entry.book) === undefined) {
      issues.push({
        path: [slug, 'book'],
        message: message(RulesMessage.EnrichmentUnknownBook, { pack, slug, book: entry.book }),
      });
    } else {
      applicable.set(slug, entry);
    }
  }
  return { applicable, issues };
}
