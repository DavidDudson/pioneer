import { keyPathText, richTextJson, slugText } from '@pioneer/rules/sdk/testing';
import { fakeSeeded } from '@pioneer/shared/kernel/testing';
import { array, dictionary, nat, oneof, record, uniqueArray, uuid } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { CURRENT_SCHEMA_VERSION } from '../character-document-upgrades';
import { CharacterId, CharacterLevel, CharacterName } from '../character-fields';
import { fixtureOwnerId } from './character-builder';
import { inventoryJson } from './inventory-arbitraries';

const LIST_MAX = 4;
const CHOICES_MAX = 12;

/** A selection: a content id or a slug (`ChoiceValue`). */
const selectionJson: Arbitrary<string> = oneof(uuid({ version: 4 }), slugText);

/** JSON of a valid `CharacterDocument` at the current schema version, as it would be stored. */
export const characterDocumentJson: Arbitrary<unknown> = record({
  seed: nat(),
  packs: array(slugText, { maxLength: LIST_MAX }),
  choices: dictionary(keyPathText, selectionJson, { maxKeys: CHOICES_MAX }),
  spellAccess: uniqueArray(uuid({ version: 4 }), { maxLength: LIST_MAX }),
  unplacedFeats: uniqueArray(uuid({ version: 4 }), { maxLength: LIST_MAX }),
  unplacedLanguages: uniqueArray(uuid({ version: 4 }), { maxLength: LIST_MAX }),
  customLanguages: uniqueArray(slugText, { maxLength: LIST_MAX }),
  rituals: uniqueArray(uuid({ version: 4 }), { maxLength: LIST_MAX }),
  inventory: inventoryJson,
  notes: richTextJson,
  appearance: richTextJson,
  personality: richTextJson,
}).map(
  ({
    seed,
    packs,
    choices,
    spellAccess,
    unplacedFeats,
    unplacedLanguages,
    customLanguages,
    rituals,
    inventory,
    notes,
    appearance,
    personality,
  }) => ({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: fakeSeeded(CharacterId, seed),
    ownerId: fixtureOwnerId,
    name: fakeSeeded(CharacterName, seed),
    level: fakeSeeded(CharacterLevel, seed),
    packs,
    build: { choices, spellAccess, unplacedFeats, unplacedLanguages, customLanguages, rituals, boons: [] },
    inventory,
    play: {},
    overrides: [],
    notes,
    appearance,
    personality,
  }),
);
