import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { ImportFile } from '@pioneer/interop/foundry';
import { FOUNDRY_IMPORTS, foundryReleaseUrl, officialPacks } from '@pioneer/rules/catalog';
import { Glob } from 'bun';

import { IMPORT_DIRECTORY } from './pack-writes.ts';

const ROOT = path.join(import.meta.dir, '../..');
const IMPORTS = path.join(ROOT, IMPORT_DIRECTORY);

/** Each committed pin's release tag, by pack: `content/import/<pack>.json`. */
async function pinnedReleases(): Promise<Record<string, string>> {
  const files = await Array.fromAsync(new Glob('*.json').scan({ cwd: IMPORTS }));
  const tags = await Promise.all(
    files.map(async (file) => {
      const { pin } = ImportFile.parse(await Bun.file(path.join(IMPORTS, file)).json());
      return [path.basename(file, '.json'), String(pin.tag)] as const;
    }),
  );
  return Object.fromEntries(tags);
}

describe('FOUNDRY_IMPORTS', () => {
  test('names the release of every committed pin, and nothing else', async () => {
    const pinned = await pinnedReleases();
    expect(Object.fromEntries(FOUNDRY_IMPORTS.map(({ pack, release }) => [pack, release]))).toStrictEqual(pinned);
  });

  test('names official packs only', () => {
    const official = new Set(officialPacks.map(({ id }) => id));
    expect(FOUNDRY_IMPORTS.filter(({ pack }) => !official.has(pack))).toStrictEqual([]);
  });

  test("links the release's page on GitHub", () => {
    expect(FOUNDRY_IMPORTS.map((each) => foundryReleaseUrl(each))).toStrictEqual([
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
    ]);
  });
});
