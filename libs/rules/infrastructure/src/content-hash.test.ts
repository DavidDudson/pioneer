import { describe, expect, test } from 'bun:test';

import { packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';

import { contentHash } from './content-hash';

const HEX_SHA256 = /^[\da-f]{64}$/u;

const packFile = { id: 'core-rules', title: 'Core Rules', publisher: 'Paizo Inc.', license: 'ORC' };

function pack(file: object): PackContents {
  return packContentsFromFiles(file, []);
}

describe('contentHash', () => {
  test('is a SHA-256 hex digest', () => {
    expect(contentHash(pack(packFile))).toMatch(HEX_SHA256);
  });

  test('ignores the order keys were written in', () => {
    const reordered = { license: 'ORC', publisher: 'Paizo Inc.', title: 'Core Rules', id: 'core-rules' };
    expect(contentHash(pack(reordered))).toBe(contentHash(pack(packFile)));
  });

  test('changes when any value does', () => {
    expect(contentHash(pack({ ...packFile, title: 'Core Rules (errata)' }))).not.toBe(contentHash(pack(packFile)));
  });
});
