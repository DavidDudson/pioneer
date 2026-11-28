/** A catalog: messages, or groups of them. */
interface Messages {
  readonly [key: string]: Messages | string;
}

function isGroup(value: Messages | string): value is Messages {
  return value instanceof Object;
}

/**
 * A locale's catalog without the messages nobody translated yet. Catalogs hold those as empty strings so translators
 * see every message (ADR-0084); the loader drops them so Transloco falls back to `en` for that key, never a blank.
 */
export function withoutUntranslated(tree: Messages): Messages {
  return Object.fromEntries(
    Object.entries(tree)
      .filter(([, value]) => value !== '')
      .map(([key, value]): [string, Messages | string] => [key, isGroup(value) ? withoutUntranslated(value) : value]),
  );
}
