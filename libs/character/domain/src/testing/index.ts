/**
 * Test-only builders and fakes. Import from `@pioneer/character/domain/testing`
 * in tests; never from production code.
 */
export { CharacterBuilder, fixtureOwnerId, humanAncestryId } from './character-builder';
export { characterDocumentJson } from './character-document-arbitraries';
export { inventory, inventoryJson } from './inventory-arbitraries';
export { PAST_DOCUMENTS } from './past-documents';
export { BOOST_FIXTURES, boostFixtureId } from './boost-content';
export {
  ITEM_FIXTURE_FILES,
  ITEM_FIXTURES,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  itemFixtureRegistry,
} from './item-content';
export {
  PLAYER_CORE_CLASS_PACK,
  PLAYER_CORE_CLASSES,
  type PlayerCoreClass,
  playerCoreClasses,
  playerCoreClassId,
  playerCoreId,
} from './player-core-classes';
export { NO_SKILLS, type SkillFixture, skillFixtureId, skillFixtures } from './skill-fixtures';
