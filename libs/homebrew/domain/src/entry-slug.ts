import { Slug } from '@pioneer/rules/sdk';
import type { ContentText } from '@pioneer/rules/sdk';

const MARKS = /\p{Mark}/gu;
const NOT_ALPHANUMERIC = /[^a-z\d]+/gu;
const EDGE_HYPHENS = /^-+|-+$/gu;

/**
 * The name an entry is filed under within its kind (ADR-0034), from the name its author typed: `Fire Giant's Axe` is
 * `fire-giant-s-axe`. Undefined when the name leaves no letters or digits.
 */
export function nameSlug(name: ContentText): Slug | undefined {
  const folded = name
    .normalize('NFKD')
    .replaceAll(MARKS, '')
    .toLowerCase()
    .replaceAll(NOT_ALPHANUMERIC, '-')
    .replaceAll(EDGE_HYPHENS, '');

  return Slug.safeParse(folded).data;
}
