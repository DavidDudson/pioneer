export { Character, CharacterWire } from './character';
export { CharacterCommand, PATCH_COMMANDS } from './character-command';
export { ANCESTRY_SLOT, CHARACTER_ROOT_SLOTS } from './character-slots';
export { CharacterContract, CharacterListQuery, CharacterSort, CreateCharacterBody } from './character-contract';
export {
  CHARACTER_LEVEL_MAX,
  CHARACTER_LEVEL_MIN,
  CHARACTER_NAME_MAX_LENGTH,
  CharacterId,
  CharacterLevel,
  CharacterName,
} from './character-fields';
export { type CharacterPatch, CharacterPatchField, CharacterPatchSchema, PatchCharacterBody } from './character-patch';
export {
  type Build,
  BuildSchema,
  type CharacterDocument,
  CharacterDocumentSchema,
  CorruptCharacterDocumentError,
  decodeCharacterDocument,
} from './character-document';
export {
  CharacterSchemaVersion,
  CURRENT_SCHEMA_VERSION,
  StoredCharacterDocument,
  UnsupportedSchemaVersionError,
  upgradeDocument,
  type UpgradeStep,
} from './character-document-upgrades';
