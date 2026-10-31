import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry, RuneType } from '@pioneer/rules/sdk';
import { runicPair } from '@pioneer/shared/kernel';

import { contentCatalog } from './index';

/** The pair each loaded property rune shows, with the runes that share it. */
async function runesByPair(): Promise<ReadonlyMap<string, readonly string[]>> {
  const registry = new ContentRegistry();
  await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
  const runes = registry.packs
    .flatMap((pack) => pack.otherEntries)
    .filter((entry) => entry.kind === ContentKind.Rune && entry.data.type === RuneType.Property);
  const byPair = new Map<string, string[]>();
  for (const rune of runes) {
    const pair = runicPair(rune.id);
    byPair.set(pair, [...(byPair.get(pair) ?? []), rune.slug]);
  }
  return byPair;
}

describe('the glyph pairs of the loaded property runes', () => {
  test('are shared by no two runes, so a book that adds a colliding rune is caught here', async () => {
    const byPair = await runesByPair();
    const shared = [...byPair].filter(([, slugs]) => slugs.length > 1);

    expect(byPair.size).toBeGreaterThan(0);
    expect(shared).toStrictEqual([]);
  });
});
