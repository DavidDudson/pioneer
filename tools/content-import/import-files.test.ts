import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { FOUNDRY_BOOK_TITLES, ImportFile } from '@pioneer/interop/foundry';
import { bookRegistry } from '@pioneer/rules/catalog';

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

// The foundry library cannot import the catalog (type:domain), so the title map is checked against it here.
describe('FOUNDRY_BOOK_TITLES', () => {
  test('maps a Foundry title to every registered book, and to nothing else', () => {
    const mapped = [...FOUNDRY_BOOK_TITLES.values()].toSorted();
    const registered = bookRegistry.books.map(({ id }) => id).toSorted();

    expect(mapped).toEqual(registered);
  });
});
