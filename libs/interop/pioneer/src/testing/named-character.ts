import { CharacterDocumentSchema } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import { characterDocumentJson } from '@pioneer/character/domain/testing';
import { ContentId, entrySlug, PackId, Slug } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { referencedId } from '../content-reference';
import type { ContentReference, ReferenceNamer } from '../content-reference';
import { rewriteReferences } from '../rewrite-references';

export const TEST_PACK = PackId.parse('test-pack');
const NAME_LENGTH = 12;

export interface NamedCharacter {
  readonly character: CharacterDocument;
  readonly name: ReferenceNamer;
  readonly ids: readonly ContentId[];
  /** What each id in `ids` is named, for building the entry that has it. */
  readonly references: ReadonlyMap<ContentId, ContentReference>;
}

/**
 * A generated character whose content ids are all the hash of a pack and slug, as real ones are, with the namer that
 * knows them. The generated documents carry arbitrary UUIDs, which nothing could name.
 */
export const namedCharacter = characterDocumentJson.map((json): NamedCharacter => {
  const references = new Map<ContentId, ContentReference>();
  const encoded = z.encode(CharacterDocumentSchema, CharacterDocumentSchema.parse(json));
  const hashed = rewriteReferences(encoded, (value) => {
    const original = ContentId.safeParse(value);
    if (!original.success) {
      return value;
    }
    const reference: ContentReference = {
      source: TEST_PACK,
      slug: entrySlug('feat', Slug.parse(`n${original.data.replaceAll('-', '').slice(0, NAME_LENGTH)}`)),
    };
    const id = referencedId(reference);
    references.set(id, reference);
    return id;
  });
  return {
    character: CharacterDocumentSchema.parse(hashed),
    name: (id) => references.get(id),
    ids: [...references.keys()],
    references,
  };
});
