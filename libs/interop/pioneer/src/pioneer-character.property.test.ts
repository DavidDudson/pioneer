import { describe, expect, test } from 'bun:test';

import { CharacterDocumentSchema } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import type { ContentId } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { assert, property } from 'fast-check';
import * as z from 'zod';

import { exportPioneerCharacter } from './export-pioneer-character';
import type { PioneerExportResult } from './export-pioneer-character';
import type { PioneerCharacterFile } from './pioneer-character-file';
import { readPioneerCharacter } from './read-pioneer-character';
import { namedCharacter } from './testing/named-character';
import type { NamedCharacter } from './testing/named-character';

installRulesFakes();

function unnamedOf(result: PioneerExportResult): readonly ContentId[] {
  return result.ok ? [] : result.unnamed;
}

const withContent = namedCharacter.filter(({ ids }) => ids.length > 0);

function fileOf({ character, name }: NamedCharacter): PioneerCharacterFile {
  const exported = exportPioneerCharacter(character, name);
  if (!exported.ok) {
    throw new Error('Expected every id to be named');
  }
  return exported.file;
}

function readBack(named: NamedCharacter): CharacterDocument {
  // Through structuredClone: the file is plain data, as it is once written out and parsed.
  const read = readPioneerCharacter(structuredClone(fileOf(named)), {
    id: named.character.id,
    ownerId: named.character.ownerId,
  });
  if (!read.ok) {
    throw new Error(`Expected the file to be read, got ${read.problem}`);
  }
  return read.character;
}

describe('Pioneer character file (properties)', () => {
  test('export then read is the identity', () => {
    assert(
      property(namedCharacter, (named) => {
        expect(z.encode(CharacterDocumentSchema, readBack(named))).toStrictEqual(
          z.encode(CharacterDocumentSchema, named.character),
        );
      }),
    );
  });

  test('a file holds no content id, character id or owner', () => {
    assert(
      property(namedCharacter, (named) => {
        const text = JSON.stringify(fileOf(named));
        expect(text).not.toContain(named.character.id);
        expect(text).not.toContain(named.character.ownerId);
        for (const id of named.ids) {
          expect(text).not.toContain(id);
        }
      }),
    );
  });

  test('ids nobody can name fail the export and are all listed', () => {
    assert(
      property(withContent, ({ character, ids }) => {
        const exported = exportPioneerCharacter(character, () => undefined);
        expect(unnamedOf(exported).toSorted()).toStrictEqual([...new Set(ids)].toSorted());
      }),
    );
  });
});
