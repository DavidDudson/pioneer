import { describe, expect, test } from 'bun:test';

import { ContentKind, RuneType } from '@pioneer/rules/sdk';
import { runicPair } from '@pioneer/shared/kernel';

import { loadRunes } from './rune-fixtures';

/** Read once, and only the rune files: loading every pack in the test overran bun's default timeout on a busy runner. */
const RUNES = await loadRunes();

/** The pair each property rune shows, with the runes that share it. */
function runesByPair(): ReadonlyMap<string, readonly string[]> {
  const byPair = new Map<string, string[]>();
  for (const rune of RUNES.filter(
    (entry) => entry.kind === ContentKind.Rune && entry.data.type === RuneType.Property,
  )) {
    const pair = runicPair(rune.id);
    byPair.set(pair, [...(byPair.get(pair) ?? []), rune.slug]);
  }
  return byPair;
}

describe('the glyph pairs of the loaded property runes', () => {
  test('are shared by no two runes, so a book that adds a colliding rune is caught here', () => {
    const byPair = runesByPair();
    const shared = [...byPair].filter(([, slugs]) => slugs.length > 1);

    expect(byPair.size).toBeGreaterThan(0);
    expect(shared).toStrictEqual([]);
  });
});
