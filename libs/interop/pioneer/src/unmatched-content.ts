import { ContentKindSchema, slugKind } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { ContentReference, referencedId } from './content-reference';
import type { ReferenceNamer } from './content-reference';
import type { PioneerCharacterFile } from './pioneer-character-file';
import { rewriteReferences } from './rewrite-references';

/** The content of one kind that a file names and no loaded pack has, each entry once. */
export const UnmatchedContentGroup = z.object({
  kind: ContentKindSchema,
  entries: z.array(ContentReference).readonly(),
});
export type UnmatchedContentGroup = z.infer<typeof UnmatchedContentGroup>;

/**
 * What a file names that `name` does not know, by kind in the order each first appears. Those entries stay in the
 * imported character as ids, so they work again once a pack that has them is loaded.
 */
export function unmatchedContent(file: PioneerCharacterFile, name: ReferenceNamer): UnmatchedContentGroup[] {
  const unmatched = new Map<string, ContentReference>();
  rewriteReferences(file.character, (value) => {
    const reference = ContentReference.safeParse(value);
    if (reference.success && name(referencedId(reference.data)) === undefined) {
      unmatched.set(`${reference.data.source}/${reference.data.slug}`, reference.data);
    }
    return value;
  });
  const groups = new Map<z.infer<typeof ContentKindSchema>, ContentReference[]>();
  for (const reference of unmatched.values()) {
    const kind = slugKind(reference.slug);
    groups.set(kind, [...(groups.get(kind) ?? []), reference]);
  }
  return [...groups].map(([kind, entries]) => ({ kind, entries }));
}
