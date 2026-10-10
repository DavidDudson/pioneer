import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { ImportFile } from '@pioneer/interop/foundry';

const IMPORT = path.join(import.meta.dir, '..', '..', 'content', 'import');
const files = [...new Bun.Glob('*.json').scanSync(IMPORT)];

describe('content/import', () => {
  test('has a pin for player-core', () => {
    expect(files).toContain('player-core.json');
  });

  test.each(files)('%s is a valid import file', async (file) => {
    const json: unknown = await Bun.file(path.join(IMPORT, file)).json();

    expect(ImportFile.safeParse(json).error).toBeUndefined();
  });
});
