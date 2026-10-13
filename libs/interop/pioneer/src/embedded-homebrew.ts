import { ContentEntry, ContentLicense, ContentPackManifest, EntrySlug } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { ContentReference, ReferenceNamer } from './content-reference';

/**
 * A homebrew pack as a file carries it: the manifest, so the author's name and the licence travel with the content
 * (ADR-0005), and the entries the character uses. Only homebrew is embedded; official content
 * is named by pack and slug and found in the importer's own packs.
 */
export const EmbeddedPack = z
  .strictObject({
    pack: ContentPackManifest.extend({ license: z.literal(ContentLicense.Homebrew) }),
    entries: z.array(ContentEntry).min(1).readonly(),
  })
  .check((context) => {
    for (const [index, entry] of context.value.entries.entries()) {
      if (entry.pack !== context.value.pack.id) {
        context.issues.push({
          code: 'custom',
          input: entry.pack,
          path: ['entries', index, 'pack'],
          message: 'An embedded entry must belong to its pack',
        });
      }
    }
  });
export type EmbeddedPack = z.infer<typeof EmbeddedPack>;

/** Names each embedded entry by the pack and slug it was written under, as the registry namer does for loaded ones. */
export function embeddedNamer(embedded: readonly EmbeddedPack[]): ReferenceNamer {
  const named = new Map<ContentId, ContentReference>();
  for (const { entries } of embedded) {
    for (const { id, pack, slug } of entries) {
      named.set(id, { source: pack, slug: EntrySlug.parse(slug) });
    }
  }
  return (id) => named.get(id);
}

/** `embedded` cut down to the entries in `used`, without the packs left with none. */
export function embeddedUsing(embedded: readonly EmbeddedPack[], used: ReadonlySet<ContentId>): EmbeddedPack[] {
  return embedded.flatMap((pack) => {
    const entries = pack.entries.filter((entry) => used.has(entry.id));
    return entries.length === 0 ? [] : [{ ...pack, entries }];
  });
}
