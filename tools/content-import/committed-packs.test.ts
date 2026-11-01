import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { Glob } from 'bun';

import { canonicalJson } from './canonical-json.ts';

const ROOT = path.resolve(import.meta.dir, '..', '..');
const PATTERNS = ['content/packs/**/*.json', 'content/import/*.json'];

async function committedFiles(): Promise<readonly string[]> {
  const found = await Promise.all(
    PATTERNS.map(async (pattern) => Array.fromAsync(new Glob(pattern).scan({ cwd: ROOT }))),
  );
  return found.flat().toSorted();
}

describe('committed pack files', () => {
  test('are in the canonical layout, so a re-run of the importer gives no diff', async () => {
    const files = await committedFiles();
    const read = await Promise.all(
      files.map(async (file) => ({ file, text: await Bun.file(path.join(ROOT, file)).text() })),
    );
    const uncanonical = read.filter(({ text }) => canonicalJson(JSON.parse(text)) !== text).map(({ file }) => file);

    expect(files.length).toBeGreaterThan(0);
    expect(uncanonical).toStrictEqual([]);
  });
});
