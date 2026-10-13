import { describe, expect, test } from 'bun:test';

import { CharacterDocumentSchema } from '@pioneer/character/domain';
import { characterDocumentJson } from '@pioneer/character/domain/testing';
import { entrySlug, PackId, Slug } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { sample } from 'fast-check';

import { exportPioneerCharacter } from './export-pioneer-character';
import type { PioneerExported } from './export-pioneer-character';
import { CURRENT_FORMAT_VERSION, PIONEER_CHARACTER_FORMAT } from './pioneer-character-file';
import { PioneerReadProblem, readPioneerCharacter } from './read-pioneer-character';
import type { PioneerReadFailure } from './read-pioneer-character';

installRulesFakes();

const SAMPLES = 1;
const [generated] = sample(characterDocumentJson, SAMPLES);
const character = CharacterDocumentSchema.parse(generated);
const target = { id: character.id, ownerId: character.ownerId };
const NEWER = 99;

function fileOf(overrides: Record<string, unknown>): unknown {
  return { format: PIONEER_CHARACTER_FORMAT, formatVersion: CURRENT_FORMAT_VERSION, character: {}, ...overrides };
}

function failureOf(input: unknown): PioneerReadFailure {
  const result = readPioneerCharacter(input, target);
  if (result.ok) {
    throw new Error('Expected the file to be refused');
  }
  return result;
}

function exportedOf(): PioneerExported {
  const result = exportPioneerCharacter(character, () => ({
    source: PackId.parse('player-core'),
    slug: entrySlug('feat', Slug.parse('x')),
  }));
  if (!result.ok) {
    throw new Error('Expected every id to be named');
  }
  return result;
}

describe('readPioneerCharacter', () => {
  test('refuses JSON that is not a Pioneer character file', () => {
    expect(failureOf({ name: 'Briar Rose' }).problem).toBe(PioneerReadProblem.Malformed);
    expect(failureOf(fileOf({ format: 'pathbuilder' })).problem).toBe(PioneerReadProblem.Malformed);
    expect(failureOf('not json').problem).toBe(PioneerReadProblem.Malformed);
  });

  test('refuses a format version newer than this code reads', () => {
    expect(failureOf(fileOf({ formatVersion: NEWER })).problem).toBe(PioneerReadProblem.NewerFormat);
  });

  test('refuses a character schema newer than this code reads', () => {
    expect(failureOf(fileOf({ character: { schemaVersion: NEWER } })).problem).toBe(PioneerReadProblem.NewerCharacter);
  });

  test('reports where a character is invalid', () => {
    const failure = failureOf(fileOf({ character: { schemaVersion: character.schemaVersion } }));
    expect(failure.problem).toBe(PioneerReadProblem.InvalidCharacter);
    expect(failure.issues.length).toBeGreaterThan(0);
  });

  test('refuses a file with a field the format does not have', () => {
    expect(failureOf(fileOf({ computed: { ac: 18 } })).problem).toBe(PioneerReadProblem.Malformed);
  });
});

describe('exportPioneerCharacter', () => {
  test('writes the format and its version', () => {
    const { file } = exportedOf();
    expect(file.format).toBe(PIONEER_CHARACTER_FORMAT);
    expect(file.formatVersion).toBe(CURRENT_FORMAT_VERSION);
  });

  test('leaves out the character id and owner', () => {
    const { file } = exportedOf();
    expect(Object.keys(file.character)).not.toContain('id');
    expect(Object.keys(file.character)).not.toContain('ownerId');
  });
});
