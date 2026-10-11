import { CharacterSchemaVersion } from '../character-document-upgrades';

/** Version 1, before the inventory held anything (#471): `inventory` was an empty object. */
const VERSION_1 = {
  schemaVersion: 1,
  id: '0b6c8f5e-1c1a-4f7e-9a39-6e1b1d1b5c11',
  ownerId: '00000000-0000-4000-8000-00000000de02',
  name: 'Valeros',
  level: 3,
  packs: [],
  build: { choices: { ancestry: '9d2d1f0a-6a4f-5b8e-9a39-6e1b1d1b5c11' }, boons: [] },
  inventory: {},
  play: {},
  overrides: [],
  notes: [],
};

/**
 * One stored document of every past schema version, in the shape that version wrote. A new upgrade step adds the
 * shape it upgrades from; `character-document.test.ts` fails until it does.
 */
export const PAST_DOCUMENTS: ReadonlyMap<CharacterSchemaVersion, unknown> = new Map([
  [CharacterSchemaVersion.parse(1), VERSION_1],
]);
