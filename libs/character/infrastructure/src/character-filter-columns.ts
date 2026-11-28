import type { CharacterFilterProperty } from '@pioneer/character/domain';
import { CHARACTER_FILTER_PROPERTIES } from '@pioneer/character/domain';
import type { FilterColumn } from '@pioneer/shared/server';

import { characters } from './character.table';

/** Where each filterable character property lives; the kinds are the ones the contract validated against. */
export const CHARACTER_FILTER_COLUMNS = {
  name: { column: characters.name, kind: CHARACTER_FILTER_PROPERTIES.name },
  level: { column: characters.level, kind: CHARACTER_FILTER_PROPERTIES.level },
  class: { column: characters.classId, kind: CHARACTER_FILTER_PROPERTIES.class },
  ancestry: { column: characters.ancestryId, kind: CHARACTER_FILTER_PROPERTIES.ancestry },
} as const satisfies Record<CharacterFilterProperty, FilterColumn>;
