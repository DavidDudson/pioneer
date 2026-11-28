import { isGroup } from './message-tree';
import type { MessageTree } from './message-tree';

/**
 * A locale's catalog without the messages nobody translated yet. Catalogs hold those as empty strings so translators
 * see every message (ADR-0084); the loader drops them so Transloco falls back to `en` for that key, never a blank.
 */
export function withoutUntranslated(tree: MessageTree): MessageTree {
  return Object.fromEntries(
    Object.entries(tree)
      .filter(([, value]) => value !== '')
      .map(([key, value]): [string, MessageTree | string] => [
        key,
        isGroup(value) ? withoutUntranslated(value) : value,
      ]),
  );
}
