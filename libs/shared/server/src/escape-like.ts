const LIKE_WILDCARDS = /[%_\\]/gu;

/** `text` with its own `%`, `_` and `\` escaped, so a LIKE pattern built from it matches it literally. */
export function escapeLike(text: string): string {
  return text.replaceAll(LIKE_WILDCARDS, String.raw`\$&`);
}
