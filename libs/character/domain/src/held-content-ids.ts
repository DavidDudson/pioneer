import { ContentId } from '@pioneer/rules/sdk';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Every uuid the document holds, wherever it sits: the class, feats, spells, items and the rest of what the character
 * picked refer to content by id. Ids of things that are not content (slots, carried copies) are in the result too, and
 * match no entry when looked up. Each once.
 */
export function heldContentIds(document: unknown): readonly ContentId[] {
  const found = new Set<ContentId>();
  const stack: unknown[] = [document];
  while (stack.length > 0) {
    const next = stack.pop();
    if (typeof next === 'string') {
      if (UUID.test(next)) {
        found.add(ContentId.parse(next.toLowerCase()));
      }
    } else if (Array.isArray(next)) {
      for (const each of next as readonly unknown[]) {
        stack.push(each);
      }
    } else if (typeof next === 'object' && next !== null) {
      for (const each of Object.values(next)) {
        stack.push(each);
      }
    }
  }
  return [...found];
}
