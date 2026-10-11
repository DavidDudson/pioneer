import { describe, expect, test } from 'bun:test';

import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { ZodError } from 'zod';

import { decodeCharacterDocument } from './character-document';
import { CURRENT_SCHEMA_VERSION, UnsupportedSchemaVersionError } from './character-document-upgrades';
import { CharacterLevel } from './character-fields';
import { fixtureOwnerId, humanAncestryId } from './testing';

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
    expect(document.build).toStrictEqual({ choices: {}, boons: [] });
    expect(document.inventory).toStrictEqual({});
    expect(document.play).toStrictEqual({});
    expect(document.overrides).toStrictEqual([]);
    expect(document.notes).toStrictEqual([]);
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
    expect(() => decodeCharacterDocument({ ...minimal, attributes: { str: 4 } })).toThrow(ZodError);
    expect(() => decodeCharacterDocument({ ...minimal, build: { choices: {}, acTotal: 18 } })).toThrow(ZodError);
  });

  test('refuses a document with no schema version', () => {
    const { schemaVersion: _omitted, ...unversioned } = minimal;
    expect(() => decodeCharacterDocument(unversioned)).toThrow(ZodError);
  });

  test('refuses a document newer than this code', () => {
    const newer = { ...minimal, schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(() => decodeCharacterDocument(newer)).toThrow(UnsupportedSchemaVersionError);
  });
});
