import { describe, expect, test } from 'bun:test';

import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';

import { CorruptCharacterDocumentError, decodeCharacterDocument } from './character-document';
import {
  CharacterSchemaVersion,
  CURRENT_SCHEMA_VERSION,
  UnsupportedSchemaVersionError,
} from './character-document-upgrades';
import { CharacterLevel } from './character-fields';
import { EMPTY_INVENTORY } from './inventory';
import { FRESH_PLAY } from './play-state';
import { fixtureOwnerId, humanAncestryId, PAST_DOCUMENTS } from './testing';

const minimal = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: '0b6c8f5e-1c1a-4f7e-9a39-6e1b1d1b5c11',
  ownerId: fixtureOwnerId,
  name: 'Valeros',
  level: 1,
};

describe('decodeCharacterDocument', () => {
  test('fills every part the player has not touched with its empty default', () => {
    const document = decodeCharacterDocument(minimal);
    expect(document.packs).toStrictEqual([]);
    expect(document.build).toStrictEqual({
      choices: {},
      spellAccess: [],
      unplacedFeats: [],
      unplacedLanguages: [],
      repertoireSwaps: [],
      boons: [],
    });
    expect(document.inventory).toStrictEqual(EMPTY_INVENTORY);
    expect(document.play).toStrictEqual(FRESH_PLAY);
    expect(document.overrides).toStrictEqual([]);
    expect(document.notes).toStrictEqual([]);
    expect(document.appearance).toStrictEqual([]);
    expect(document.personality).toStrictEqual([]);
  });

  test('keeps choices by slot key', () => {
    const document = decodeCharacterDocument({ ...minimal, build: { choices: { ancestry: humanAncestryId } } });
    expect(document.build.choices[SlotKey.parse('ancestry')]).toBe(ChoiceValue.parse(humanAncestryId));
  });

  test('keeps a selection whatever the level, so a planned or hidden pick survives', () => {
    const planned = { 'feat:class:20': 'sudden-charge' };
    const document = decodeCharacterDocument({
      ...minimal,
      level: CharacterLevel.parse(1),
      build: { choices: planned },
    });
    expect(document.build.choices).toStrictEqual(planned);
  });

  test('refuses derived values: only inputs are stored', () => {
    expect(() => decodeCharacterDocument({ ...minimal, attributes: { str: 4 } })).toThrow(
      CorruptCharacterDocumentError,
    );
    expect(() => decodeCharacterDocument({ ...minimal, build: { choices: {}, acTotal: 18 } })).toThrow(
      CorruptCharacterDocumentError,
    );
  });

  test.each([undefined, 0, -1, 1.5, '1'])('refuses schema version %p as corrupt', (schemaVersion) => {
    expect(() => decodeCharacterDocument({ ...minimal, schemaVersion })).toThrow(CorruptCharacterDocumentError);
  });

  test('refuses a document newer than this code', () => {
    const newer = { ...minimal, schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(() => decodeCharacterDocument(newer)).toThrow(UnsupportedSchemaVersionError);
  });

  test('has a stored document of every past schema version', () => {
    const past = Array.from({ length: CURRENT_SCHEMA_VERSION - 1 }, (_unused, index) =>
      CharacterSchemaVersion.parse(index + 1),
    );
    expect([...PAST_DOCUMENTS.keys()].toSorted((left, right) => left - right)).toStrictEqual(past);
  });

  test.each([...PAST_DOCUMENTS])('decodes a version %p document at the current version', (_version, stored) => {
    expect(decodeCharacterDocument(stored).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('upgrades a version 5 document to one with an empty appearance and personality', () => {
    const upgraded = decodeCharacterDocument(PAST_DOCUMENTS.get(CharacterSchemaVersion.parse(5)));
    expect(upgraded.appearance).toStrictEqual([]);
    expect(upgraded.personality).toStrictEqual([]);
  });
});
