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

/** Version 2, before items were worn, held or invested (#472): an item had no `carry` or `invested`. */
const VERSION_2 = {
  ...VERSION_1,
  schemaVersion: 2,
  inventory: {
    items: [
      {
        id: '5f0e8a43-2d71-4c3e-9b6a-0d3c1e7f2a10',
        item: '3c9a6b1e-7d24-5f80-8e1b-4a2c6d9f0b37',
        quantity: 1,
      },
      {
        id: '8b1d4c62-9e05-4a7f-b3c8-1f6e2a0d5c94',
        item: '6e2f8d3a-1b47-5c90-9a6e-7d3b0c4f1e28',
        quantity: 50,
        container: '5f0e8a43-2d71-4c3e-9b6a-0d3c1e7f2a10',
        name: 'Fletched by Kyra',
      },
    ],
    coins: { pp: 0, gp: 15, sp: 3, cp: 0 },
  },
};

/** Version 3, before a build listed spell access (#478): `build` had no `spellAccess`. */
const VERSION_3 = {
  ...VERSION_2,
  schemaVersion: 3,
  inventory: {
    ...VERSION_2.inventory,
    items: VERSION_2.inventory.items.map((item, index) =>
      index === 0
        ? { ...item, carry: { state: 'held', hands: 1 }, invested: true }
        : { ...item, carry: { state: 'stowed' } },
    ),
  },
};

/** Version 4, before Hit Points in play (#343): `play` was empty. */
const VERSION_4 = {
  ...VERSION_3,
  schemaVersion: 4,
  build: { ...VERSION_3.build, spellAccess: [] },
  play: {},
};

/** Version 5, before a character had an appearance or a personality (#500): the document had neither field. */
const VERSION_5 = {
  ...VERSION_4,
  schemaVersion: 5,
};

/** Version 6, before a second class (#705): `build.choices` held no `second-class` pick. */
const VERSION_6 = {
  ...VERSION_5,
  schemaVersion: 6,
};

/** Version 7, before repertoire swaps (#594): `build` had no `repertoireSwaps`. */
const VERSION_7 = {
  ...VERSION_6,
  schemaVersion: 7,
};

/**
 * One stored document of every past schema version, in the shape that version wrote. A new upgrade step adds the
 * shape it upgrades from; `character-document.test.ts` fails until it does.
 */
export const PAST_DOCUMENTS: ReadonlyMap<CharacterSchemaVersion, unknown> = new Map([
  [CharacterSchemaVersion.parse(1), VERSION_1],
  [CharacterSchemaVersion.parse(2), VERSION_2],
  [CharacterSchemaVersion.parse(VERSION_3.schemaVersion), VERSION_3],
  [CharacterSchemaVersion.parse(VERSION_4.schemaVersion), VERSION_4],
  [CharacterSchemaVersion.parse(VERSION_5.schemaVersion), VERSION_5],
  [CharacterSchemaVersion.parse(VERSION_6.schemaVersion), VERSION_6],
  [CharacterSchemaVersion.parse(VERSION_7.schemaVersion), VERSION_7],
]);
