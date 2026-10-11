import { keyPathText, richTextJson, slugText } from '@pioneer/rules/sdk/testing';
import { fakeSeeded } from '@pioneer/shared/kernel/testing';
import { array, dictionary, nat, oneof, record, uuid } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { CURRENT_SCHEMA_VERSION } from '../character-document-upgrades';
import { CharacterId, CharacterLevel, CharacterName } from '../character-fields';
import { fixtureOwnerId } from './character-builder';

const LIST_MAX = 4;
const CHOICES_MAX = 12;

/** A selection: a content id or a slug (`ChoiceValue`). */
const selectionJson: Arbitrary<string> = oneof(uuid({ version: 4 }), slugText);

/** JSON of a valid `CharacterDocument` at the current schema version, as it would be stored. */
export const characterDocumentJson: Arbitrary<unknown> = record({
  seed: nat(),
  packs: array(slugText, { maxLength: LIST_MAX }),
  choices: dictionary(keyPathText, selectionJson, { maxKeys: CHOICES_MAX }),
  notes: richTextJson,
}).map(({ seed, packs, choices, notes }) => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: fakeSeeded(CharacterId, seed),
  ownerId: fixtureOwnerId,
  name: fakeSeeded(CharacterName, seed),
  level: fakeSeeded(CharacterLevel, seed),
  packs,
  build: { choices, boons: [] },
  inventory: {},
  play: {},
  overrides: [],
  notes,
}));
