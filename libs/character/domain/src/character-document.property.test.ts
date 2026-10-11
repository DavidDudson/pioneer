import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';
import { assert, integer, property } from 'fast-check';
import * as z from 'zod';

import { CharacterDocumentSchema, decodeCharacterDocument } from './character-document';
import {
  CharacterSchemaVersion,
  currentVersion,
  StoredCharacterDocument,
  UnsupportedSchemaVersionError,
  upgradeDocument,
} from './character-document-upgrades';
import type { UpgradeStep } from './character-document-upgrades';
import { characterDocumentJson } from './testing';

installRulesFakes();
const document = characterDocumentJson.map((json) => CharacterDocumentSchema.parse(json));

const CHAIN_LENGTH = 6;

/** A stored document carrying the versions each upgrade step was run from, in the order they ran. */
const Marked = StoredCharacterDocument.extend({ upgradedFrom: z.array(CharacterSchemaVersion).default([]) });

/** `CHAIN_LENGTH` steps, each adding the version it upgraded from to the document it returns. */
const chain: readonly UpgradeStep[] = Array.from(
  { length: CHAIN_LENGTH },
  (): UpgradeStep =>
    (stored: StoredCharacterDocument): StoredCharacterDocument => {
      const marked = Marked.parse(stored);
      return { ...marked, upgradedFrom: [...marked.upgradedFrom, marked.schemaVersion] };
    },
);

const pastVersion = integer({ min: 1, max: CHAIN_LENGTH + 1 }).map((version) => CharacterSchemaVersion.parse(version));

function versionsFrom(from: CharacterSchemaVersion): CharacterSchemaVersion[] {
  return Array.from({ length: currentVersion(chain) - from }, (_unused, step) =>
    CharacterSchemaVersion.parse(from + step),
  );
}

describe('CharacterDocument (properties)', () => {
  test('decode(stored JSON of encode(d)) re-encodes identically', () => {
    assert(
      property(document, (original) => {
        const encoded = z.encode(CharacterDocumentSchema, original);
        // Through JSON text, not structuredClone: a jsonb write drops what JSON can't hold, and so must this.
        const written = JSON.stringify(encoded);
        const stored: unknown = JSON.parse(written);
        expect(z.encode(CharacterDocumentSchema, decodeCharacterDocument(stored))).toStrictEqual(encoded);
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

  test('every past version reaches the current one through each later step, in order, keeping its output', () => {
    assert(
      property(pastVersion, (from) => {
        const upgraded = Marked.parse(upgradeDocument({ schemaVersion: from }, chain));
        expect(upgraded.schemaVersion).toBe(currentVersion(chain));
        expect(upgraded.upgradedFrom).toStrictEqual(versionsFrom(from));
      }),
    );
  });

  test('upgrading twice is the same as upgrading once', () => {
    assert(
      property(pastVersion, (from) => {
        const once = upgradeDocument({ schemaVersion: from }, chain);
        expect(upgradeDocument(once, chain)).toStrictEqual(once);
      }),
    );
  });

  test('a version past the chain is refused, never read as the current one', () => {
    assert(
      property(integer({ min: CHAIN_LENGTH + 2, max: 1000 }), (newer) => {
        expect(() => upgradeDocument({ schemaVersion: CharacterSchemaVersion.parse(newer) }, chain)).toThrow(
          UnsupportedSchemaVersionError,
        );
      }),
    );
  });
});
