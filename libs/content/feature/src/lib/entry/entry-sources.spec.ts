import { ContentLicense, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentEntry, SourceRef } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { packLicenses } from '../browser/browse-legacy';
import { browseSources, storeLinks } from './entry-sources';

const PACK = new ContentPackBuilder().withId('sources-test').withFeat('sudden-charge').build();

function entryCiting(...sources: readonly SourceRef[]): ContentEntry {
  const [first] = PACK.otherEntries;
  if (first === undefined) {
    throw new Error('The test pack holds no entry');
  }
  return { ...first, sources };
}

const PLAYER_CORE = { kind: 'book', book: 'player-core' } as unknown as SourceRef;
const UNREGISTERED = { kind: 'book', book: 'not-a-book' } as unknown as SourceRef;

describe(browseSources, () => {
  it('gives each source its registry book and the entry licence', () => {
    const registry = new ContentRegistry();
    registry.register(PACK);
    const [source] = browseSources(entryCiting(PLAYER_CORE), packLicenses(registry));
    expect(source?.book?.id).toBe('player-core');
    expect(source?.license).toBe(ContentLicense.Homebrew);
  });

  it('leaves the book out for a book the registry lacks', () => {
    const [source] = browseSources(entryCiting(UNREGISTERED), new Map());
    expect(source?.book).toBeUndefined();
  });
});

describe(storeLinks, () => {
  it('links a book the Paizo Store lists', () => {
    expect(storeLinks(entryCiting(PLAYER_CORE)).map((link) => link.url)).toStrictEqual([
      'https://store.paizo.com/pathfinder-player-core/',
    ]);
  });

  it('links a book once however often it is cited', () => {
    expect(storeLinks(entryCiting(PLAYER_CORE, PLAYER_CORE))).toHaveLength(1);
  });

  it('gives no link for a book the registry lacks', () => {
    expect(storeLinks(entryCiting(UNREGISTERED))).toStrictEqual([]);
  });
});
