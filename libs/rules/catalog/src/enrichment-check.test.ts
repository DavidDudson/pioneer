import { describe, expect, test } from 'bun:test';

import { EnrichmentMappingFile, EntrySlug, PackId, RulesMessage } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { bookRegistry } from './book-registry';
import { checkEnrichment } from './enrichment-check';
import type { EnrichmentTarget } from './enrichment-check';

const PACK = PackId.parse('player-core');
const KNOWN = EntrySlug.parse('feat:power-attack');
const TARGET: EnrichmentTarget = { pack: PACK, slugs: new Set([KNOWN]), registry: bookRegistry };

describe('checkEnrichment', () => {
  test('applies a mapping for a known slug and registered book', () => {
    const mapping = EnrichmentMappingFile.parse({ [KNOWN]: { book: 'player-core', page: 1 } });
    const { applicable, issues } = checkEnrichment(mapping, TARGET);
    expect([...applicable.keys()]).toEqual([KNOWN]);
    expect(issues).toEqual([]);
  });

  test('reports an unknown slug and does not apply it', () => {
    const mapping = EnrichmentMappingFile.parse({ 'feat:no-such-feat': { book: 'player-core' } });
    const { applicable, issues } = checkEnrichment(mapping, TARGET);
    expect(applicable.size).toBe(0);
    expect(issues.map((issue) => issue.message.key)).toEqual([RulesMessage.EnrichmentUnknownSlug]);
  });

  test('reports an unknown book and does not apply it', () => {
    const mapping = EnrichmentMappingFile.parse({ [KNOWN]: { book: 'no-such-book' } });
    const { applicable, issues } = checkEnrichment(mapping, TARGET);
    expect(applicable.size).toBe(0);
    expect(issues).toEqual([
      {
        path: [KNOWN, 'book'],
        message: message(RulesMessage.EnrichmentUnknownBook, { pack: PACK, slug: KNOWN, book: 'no-such-book' }),
      },
    ]);
  });
});
