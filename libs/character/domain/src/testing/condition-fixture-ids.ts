import { contentId, ContentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

/** The pack the item fixtures live in. */
export const ITEM_PACK = 'item-fixtures';

/**
 * The encumbered condition and the clumsy it grants, as Player Core has them: Clumsy 1's status penalty reaches AC and
 * the other Dexterity-based statistics, so the sheet shows it.
 */
export const ENCUMBERED = 'encumbered';
export const CLUMSY = 'clumsy';

/** The id of the fixture encumbered condition. */
export function encumberedFixtureId(): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`condition:${ENCUMBERED}`)));
}

/** The id of the fixture clumsy condition, which encumbered grants. */
export function clumsyFixtureId(): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`condition:${CLUMSY}`)));
}

/** The underwater environment: a circumstance penalty to Fortitude saves, and no speech. */
export const UNDERWATER = 'underwater';

/** The id of the fixture underwater environment. */
export function underwaterFixtureId(): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`environment:${UNDERWATER}`)));
}

/** A condition that lifts underwater's speech restriction, as an aquatic trait or water breathing would. */
export const GILLED = 'gilled';

/** The id of the fixture gilled condition. */
export function gilledFixtureId(): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`condition:${GILLED}`)));
}
