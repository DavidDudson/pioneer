import { ContentId } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';

/** A uuid held as a string value: object keys (a uuid followed by a colon) are not what a document refers to. */
const HELD_UUID = /"(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"(?!:)/giu;

/**
 * Every uuid the document holds, wherever it sits: the class, feats, spells, items and the rest of what the character
 * picked refer to content by id. Ids of things that are not content (slots, carried copies) are in the result too, and
 * match no entry when looked up. Each once.
 */
export function heldContentIds(document: CharacterDocument): ReadonlyArray<ContentId> {
  const found = new Set<ContentId>();

  for (const { groups } of JSON.stringify(document).matchAll(HELD_UUID)) {
    found.add(ContentId.parse(groups?.['id']?.toLowerCase()));
  }

  return [...found];
}
