/**
 * Test-only builders and fakes. Import from `@pioneer/character/domain/testing`
 * in tests; never from production code.
 */
export { CharacterBuilder, fixtureOwnerId, humanAncestryId } from './character-builder';
export { characterDocumentJson } from './character-document-arbitraries';
export { inventory, inventoryJson } from './inventory-arbitraries';
export { PAST_DOCUMENTS } from './past-documents';
export { within } from './play-limits';
export { HUMAN_HIT_POINTS, hitPointsContent } from './hit-points-content';
export { BOOST_FIXTURES, boostFixtureId } from './boost-content';
export {
  ITEM_FIXTURE_FILES,
  ITEM_FIXTURES,
  clumsyFixtureId,
  encumberedFixtureId,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  itemFixtureRegistry,
  RuneFixture,
  runeFixtureContent,
  runeFixtureId,
} from './item-content';
export { KIT_FIXTURE_FILES, KIT_FIXTURES, KitFixture, kitFixtureContent, kitFixtureId } from './kit-fixtures';
export {
  PLAYER_CORE_CLASS_PACK,
  PLAYER_CORE_CLASSES,
  type PlayerCoreClass,
  playerCoreClasses,
  playerCoreClassId,
  playerCoreId,
} from './player-core-classes';
export {
  DEDICATION_CLASS,
  DEDICATION_FIXTURES,
  dedicationSlot,
  type DedicationFixture,
  dedicationArchetypeId,
  dedicationFixtureId,
} from './dedication-fixtures';
export { Armoury, armoury, fundamental, fundamentalRef, lineOf, propertyRune } from './rune-armoury';
export { NO_SKILLS, type SkillFixture, skillFixtureId, skillFixtures } from './skill-fixtures';
export {
  type LanguageBackground,
  type LanguageFixture,
  languageBackgroundId,
  languageDwarfId,
  NO_LANGUAGES,
  languageFixtureId,
  languageFixtures,
  languageOrcId,
} from './language-fixtures';
export { NO_FEATS } from './feat-fixtures';
export { NO_SPELLS, type SpellFixture, spellFixtureId, spellFixtures } from './spell-fixtures';
export {
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  FEAT_SLOT_KEYS,
  type FeatSlotFixture,
  featSlotFixtureId,
} from './feat-slot-fixtures';
