import type { FoundryDocument } from './foundry-document';

/*
 * Foundry pf2e's slug algorithm (src/util/misc.ts, default style): what an item's `slug` getter returns when the
 * document sets none, which is nearly every document in the pack sources.
 */

const NON_WORD = /[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/gu;
const LOWER_THEN_UPPER =
  /(?<lower>\p{Lowercase_Letter})(?<upper>\p{Uppercase_Letter}(?=^|$|[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]))/gu;
const APOSTROPHES = /['’]/gu;
const SEPARATORS = /[-\s]+/gu;

/** `Champion's Reaction` to `champions-reaction`, as Foundry does it. */
export function slugify(text: string): string {
  // Foundry keeps a lone hyphen, which the steps below would wipe.
  if (text === '-') {
    return text;
  }
  return text
    .replace(LOWER_THEN_UPPER, '$<lower>-$<upper>')
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(NON_WORD, ' ')
    .trim()
    .replace(SEPARATORS, '-');
}

/** A document's Foundry slug: `system.slug` when set, otherwise its name, slugified. */
export function foundrySlug(document: FoundryDocument): string {
  return document.system.slug ?? slugify(document.name);
}

const MARKS = /\p{Mark}/gu;

/**
 * A document's Foundry slug with diacritics folded (`déjà-vu` to `deja-vu`), since Pioneer slugs are ASCII. The one
 * place an imported slug departs from Foundry's; `externalIds.foundry` keeps the link to the document.
 */
export function asciiSlug(document: FoundryDocument): string {
  return folded(foundrySlug(document));
}

function folded(slug: string): string {
  return slug.normalize('NFKD').replace(MARKS, '');
}

/** A name slugified as Foundry does it, diacritics folded: for what Foundry names but keeps no item for (a journal page). */
export function asciiNameSlug(name: string): string {
  return folded(slugify(name));
}
