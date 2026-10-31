import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * A content entry as a file names it: the pack it comes from and its entry slug, which names its kind
 * (`player-core`, `ancestry:human`; ADR-0005, ADR-0034). Ids are hashes of these, so a file never carries one.
 */
export const ContentReference = z.strictObject({ source: PackId, slug: EntrySlug });
export type ContentReference = z.infer<typeof ContentReference>;

/** The id of the entry a reference names: the same on every server, with no lookup. */
export function referencedId(reference: ContentReference): ContentId {
  return ContentId.parse(contentId(reference.source, reference.slug));
}

/** Where an export finds the pack and slug an id hashes from (the content registry); undefined for an unknown id. */
export type ReferenceNamer = (id: ContentId) => ContentReference | undefined;
