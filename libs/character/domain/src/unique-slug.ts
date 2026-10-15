import { Slug, SOURCE_SLUG_MAX } from '@pioneer/rules/sdk';

/** Room left in a weapon's slug for the `-<n>` that tells two of the same weapon apart. */
const SUFFIX_ROOM = 4;

/**
 * `name`, or `name-2`, `name-3` for the second and third of the same weapon. A name too long to be a source slug is
 * cut short, leaving room for the count.
 */
export function uniqueSlug(name: Slug, taken: ReadonlySet<Slug>): Slug {
  if (name.length <= SOURCE_SLUG_MAX && !taken.has(name)) {
    return name;
  }
  const base = name.slice(0, SOURCE_SLUG_MAX - SUFFIX_ROOM).replace(/-+$/u, '');
  let slug = Slug.parse(base);
  for (let count = 2; taken.has(slug); count += 1) {
    slug = Slug.parse(`${base}-${count}`);
  }
  return slug;
}
