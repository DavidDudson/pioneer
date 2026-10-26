import { describe, expect, test } from 'bun:test';

import { EnrichmentMappingFile } from './enrichment-mapping';

const FEAT = 'feat:power-attack';
const AON = 'https://2e.aonprd.com/Feats.aspx?ID=4689';

function accepts(mapping: unknown): boolean {
  return EnrichmentMappingFile.safeParse({ [FEAT]: mapping }).success;
}

describe('EnrichmentMappingFile', () => {
  test('accepts a book alone, a page, and an AoN entry', () => {
    expect(accepts({ book: 'player-core' })).toBe(true);
    expect(accepts({ book: 'player-core', page: 123 })).toBe(true);
    expect(accepts({ book: 'player-core', page: 123, aon: AON })).toBe(true);
  });

  test('rejects a search page', () => {
    expect(accepts({ book: 'player-core', aon: 'https://2e.aonprd.com/Search.aspx?q=power+attack' })).toBe(false);
  });

  test('rejects a host other than 2e.aonprd.com', () => {
    expect(accepts({ book: 'player-core', aon: 'https://example.com/Feats.aspx?ID=1' })).toBe(false);
    expect(accepts({ book: 'player-core', aon: 'https://aonprd.com/Feats.aspx?ID=1' })).toBe(false);
  });

  test('rejects a page that is not positive', () => {
    expect(accepts({ book: 'player-core', page: 0 })).toBe(false);
    expect(accepts({ book: 'player-core', page: -3 })).toBe(false);
  });

  test('rejects unknown fields and a missing book', () => {
    expect(accepts({ book: 'player-core', note: 'x' })).toBe(false);
    expect(accepts({ page: 1 })).toBe(false);
  });

  test('rejects a key that is not an entry slug', () => {
    expect(EnrichmentMappingFile.safeParse({ 'Power Attack': { book: 'player-core' } }).success).toBe(false);
  });
});
