import { describe, expect, test } from 'bun:test';

import { archiveUrl, FoundryReleaseTag, ImportFile, Sha256, sha256 } from './import-pin';

describe('sha256', () => {
  test('hashes bytes to lowercase hex', async () => {
    const digest = await sha256(new TextEncoder().encode('abc'));

    expect(digest).toBe(Sha256.parse('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
  });
});

describe('ImportFile', () => {
  test('reads a pin and an empty backlog', () => {
    const file = { pin: { tag: 'pf2e-8.6.0', sha256: 'a'.repeat(64) }, backlog: [] };

    expect(ImportFile.parse(file).pin.tag).toBe(FoundryReleaseTag.parse('pf2e-8.6.0'));
  });

  test.each([
    { tag: 'v8.6.0', sha256: 'a'.repeat(64) },
    { tag: 'pf2e-8.6.0', sha256: 'A'.repeat(64) },
    { tag: 'pf2e-8.6.0', sha256: 'a'.repeat(63) },
  ])('rejects pin %o', (pin) => {
    expect(ImportFile.safeParse({ pin, backlog: [] }).success).toBe(false);
  });
});

describe('archiveUrl', () => {
  test('is the tag source archive on GitHub', () => {
    expect(archiveUrl(FoundryReleaseTag.parse('pf2e-8.6.0'))).toBe(
      'https://github.com/foundryvtt/pf2e/archive/refs/tags/pf2e-8.6.0.tar.gz',
    );
  });
});
