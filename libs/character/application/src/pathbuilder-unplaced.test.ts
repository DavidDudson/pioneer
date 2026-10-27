import { describe, expect, test } from 'bun:test';

import { ImportKind, PathbuilderName } from '@pioneer/interop/pathbuilder';
import type { ContentLookup, ImportedFeat } from '@pioneer/interop/pathbuilder';
import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { keptPicks } from './pathbuilder-unplaced';

const pack = PackId.parse('player-core');
const elven = ContentId.parse(contentId(pack, EntrySlug.parse('language:elven')));
const dodge = ContentId.parse(contentId(pack, EntrySlug.parse('feat:nimble-dodge')));

/** A lookup that knows Elven and Nimble Dodge, by name. */
const lookup = {
  resolve: (kind: ImportKind, name: string) => {
    const known: Partial<Record<ImportKind, Record<string, typeof elven>>> = {
      [ImportKind.Language]: { Elven: elven },
      [ImportKind.Feat]: { 'Nimble Dodge': dodge },
    };
    const id = known[kind]?.[name];
    return id === undefined ? undefined : { id, name };
  },
} as unknown as ContentLookup;

const name = (value: string): PathbuilderName => PathbuilderName.parse(value);

describe('keptPicks', () => {
  test('keeps each matched feat and language once, and leaves out a name that matched nothing', () => {
    const feats = [
      { name: name('Nimble Dodge') },
      { name: name('Nimble Dodge') },
    ] as unknown as readonly ImportedFeat[];
    const picks = keptPicks(feats, [name('Elven'), name('Elven'), name('Klingon')], lookup);
    expect(picks).toStrictEqual({ unplacedFeats: [dodge], unplacedLanguages: [elven] });
  });
});
