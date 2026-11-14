import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { ContentEntryFile, ContentKind, slugName, Trait, traitId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

const ROOT = path.resolve(import.meta.dir, '..', '..');
const TRAIT_FILES = 'content/packs/core-rules/**/trait.json';

describe('committed trait entries', () => {
  test('each carries the id traitId gives its slug, so a chip can open its card', async () => {
    const files = await Array.fromAsync(new Glob(TRAIT_FILES).scan({ cwd: ROOT }));
    const parsed = await Promise.all(
      files.map(async (file) => ContentEntryFile.parse(await Bun.file(path.join(ROOT, file)).json())),
    );
    const traits = parsed.flat().filter((entry) => entry.kind === ContentKind.Trait);
    const mismatched = traits
      .filter((entry) => traitId(Trait.parse(slugName(entry.slug))) !== entry.id)
      .map((entry) => entry.slug);

    expect(traits.length).toBeGreaterThan(0);
    expect(mismatched).toStrictEqual([]);
  });
});
