import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { assert, integer, property } from 'fast-check';

import { CharacterDocumentSchema, decodeCharacterDocument } from './character-document';
import {
  CharacterSchemaVersion,
  currentVersion,
  UnsupportedSchemaVersionError,
  upgradeDocument,
} from './character-document-upgrades';
import type { StoredCharacterDocument, UpgradeStep } from './character-document-upgrades';
import { characterDocumentJson } from './testing';

installRulesFakes();
const document = characterDocumentJson.map((json) => CharacterDocumentSchema.parse(json));

const CHAIN_LENGTH = 6;

/** A chain of `CHAIN_LENGTH` steps that log the version each one upgraded from, so a test sees what ran. */
function loggingChain(log: CharacterSchemaVersion[]): readonly UpgradeStep[] {
  return Array.from(
    { length: CHAIN_LENGTH },
    (): UpgradeStep =>
      (stored: StoredCharacterDocument): StoredCharacterDocument => {
        log.push(stored.schemaVersion);
        return stored;
      },
  );
}

const pastVersion = integer({ min: 1, max: CHAIN_LENGTH + 1 }).map((version) => CharacterSchemaVersion.parse(version));

describe('CharacterDocument (properties)', () => {
  test('decoding a stored copy gives the same document', () => {
    assert(
      property(document, (original) => {
        const stored: unknown = structuredClone(original);
        expect(decodeCharacterDocument(stored)).toStrictEqual(original);
      }),
    );
  });

  test('a document at the current version is left as it is', () => {
    assert(
      property(document, (original) => {
        expect(upgradeDocument(original)).toStrictEqual(original);
      }),
    );
  });

  test('every past version reaches the current one, running each later step once, in order', () => {
    assert(
      property(pastVersion, (from) => {
        const log: CharacterSchemaVersion[] = [];
        const chain = loggingChain(log);
        const upgraded = upgradeDocument({ schemaVersion: from }, chain);
        expect(upgraded.schemaVersion).toBe(currentVersion(chain));
        expect(log).toStrictEqual(
          Array.from({ length: currentVersion(chain) - from }, (_unused, step) =>
            CharacterSchemaVersion.parse(from + step),
          ),
        );
      }),
    );
  });

  test('upgrading twice is the same as upgrading once', () => {
    assert(
      property(pastVersion, (from) => {
        const chain = loggingChain([]);
        const once = upgradeDocument({ schemaVersion: from }, chain);
        expect(upgradeDocument(once, chain)).toStrictEqual(once);
      }),
    );
  });

  test('a version past the chain is refused, never read as the current one', () => {
    assert(
      property(integer({ min: CHAIN_LENGTH + 2, max: 1000 }), (newer) => {
        const chain = loggingChain([]);
        expect(() => upgradeDocument({ schemaVersion: CharacterSchemaVersion.parse(newer) }, chain)).toThrow(
          UnsupportedSchemaVersionError,
        );
      }),
    );
  });
});
