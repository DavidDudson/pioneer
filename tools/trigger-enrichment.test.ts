import { describe, expect, test } from 'bun:test';

import { triggerMatches } from '@pioneer/rules/catalog';
import { ContentEntryFile, contentId, PackId, Slug } from '@pioneer/rules/sdk';

import { enrichTriggerFile } from './trigger-enrichment.ts';

const PACK = 'player-core';
const prose = (words: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text: words }] }];

/** A Player Core entry's JSON, as a pack file holds it. */
function entry(slug: string, kind: string, data: object): object {
  return {
    id: contentId(PackId.parse(PACK), Slug.parse(slug)),
    pack: PACK,
    slug,
    kind,
    name: slug,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    ...(kind === 'action' ? {} : { level: 1 }),
    data,
  };
}

const free = (words: string): object => ({ cost: 'free', trigger: prose(words) });
const TURN_START = { event: 'turn-start' };
const FOCUS = { event: 'cast-spell', predicate: ['item:trait:focus'] };

/** The file after the pass, with matches read from its own entries. */
function enrich(file: readonly object[]): readonly unknown[] | undefined {
  const matches = triggerMatches(ContentEntryFile.parse(file), new Map());
  return enrichTriggerFile(file, new Map(matches.map((match) => [match.entry, match.triggerEvent])));
}

describe('trigger enrichment', () => {
  test('sets the event on matched actions and on the action a feat is', () => {
    const steady = entry('steady', 'action', free('Your turn begins.'));
    const focused = entry('focused', 'feat', { category: 'class', action: free('You cast a focus spell.') });

    expect(enrich([steady, focused])).toStrictEqual([
      entry('steady', 'action', { ...free('Your turn begins.'), triggerEvent: TURN_START }),
      entry('focused', 'feat', {
        category: 'class',
        action: { ...free('You cast a focus spell.'), triggerEvent: FOCUS },
      }),
    ]);
  });

  test('leaves unmatched and corrected entries as they were', () => {
    const corrected = entry('corrected', 'action', {
      ...free('Your turn begins.'),
      triggerEvent: { event: 'turn-end' },
    });
    const unmatched = entry('unmatched', 'action', free('An ally is about to use an action.'));
    const steady = entry('steady', 'action', free('Your turn begins.'));

    const enriched = enrich([corrected, unmatched, steady]);

    expect(enriched?.[0]).toBe(corrected);
    expect(enriched?.[1]).toBe(unmatched);
    expect(enrich([corrected, unmatched])).toBeUndefined();
  });
});
