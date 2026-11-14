import type { Character, CharacterFilter } from '@pioneer/character/domain';
import type { AncestryId, ContentId } from '@pioneer/rules/sdk';
import { eq, gte, ilike, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { characters } from './character.table';

const LIKE_WILDCARDS = /[%_\\]/gu;

/** The conditions the list's filters make, to AND; an absent filter makes none. */
export function filterConditions(filter: CharacterFilter): readonly (SQL | undefined)[] {
  const search = filter.name?.replaceAll(LIKE_WILDCARDS, String.raw`\$&`);
  return [
    filter.minLevel === undefined ? undefined : gte(characters.level, filter.minLevel),
    filter.maxLevel === undefined ? undefined : lte(characters.level, filter.maxLevel),
    filter.classId === undefined ? undefined : eq(characters.classId, filter.classId),
    filter.ancestry === undefined ? undefined : eq(characters.ancestryId, filter.ancestry),
    // The text is matched literally: its own `%`, `_` and `\` are escaped.
    search === undefined ? undefined : ilike(characters.name, `%${search}%`),
  ];
}

/** What `listColumnsOf` reads: each column's value, null while its slot is empty. */
interface ListColumns {
  readonly ancestryId: AncestryId | null;
  readonly classId: ContentId | null;
}

/** The list columns a row keeps in step with its character's document: the ancestry and class picked. */
export function listColumnsOf(character: Character): ListColumns {
  // A column is cleared with null: undefined would leave the last pick in place.
  // oxlint-disable-next-line unicorn/no-null -- see above
  return { ancestryId: character.ancestry ?? null, classId: character.classId ?? null };
}
