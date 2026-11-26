import { describe, expect, test } from 'bun:test';

import { ContentEntry, contentId, ContentKey, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { JsonObject, JsonValue } from '@pioneer/rules/sdk/testing';

import { triggerCoverage } from './trigger-coverage';

const PACK = 'player-core';
const prose = (words: string): JsonValue[] => [{ type: 'paragraph', content: [{ type: 'text', text: words }] }];

/** A Player Core entry of `kind` with `data`. */
function entry(name: string, kind: string, data: JsonObject): ContentEntry {
  const slug = `${kind}:${name}`;

  const fields = {
    id: contentId(PackId.parse(PACK), EntrySlug.parse(slug)),
    pack: PACK,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    kind,
    data,
  };

  return ContentEntry.parse(kind === 'action' || kind === 'effect' ? fields : { ...fields, level: 1 });
}

const reaction = { cost: 'reaction', trigger: prose('An ally is about to use an action.') };
const wording = (words: string): JsonObject => ({ cost: 'reaction', trigger: prose(words) });
const turnStart = { triggerEvent: { event: 'turn-start' } };

describe('trigger coverage', () => {
  test('counts actions with a trigger and lists those without an event', () => {
    const entries = [
      entry('steady', 'action', { ...reaction, ...turnStart }),
      entry('aid', 'action', reaction),
      entry('stride', 'action', { cost: 'one' }),
      entry('swift', 'feat', { category: 'class', action: reaction }),
      entry('focused', 'class-feature', { action: { ...reaction, ...turnStart } }),
      entry('renewal', 'effect', { category: 'spell', duration: { type: 'encounter' }, ...turnStart }),
    ];

    expect(triggerCoverage(entries)).toStrictEqual({
      triggered: 4,
      withoutEvent: ['player-core/action:aid', 'player-core/feat:swift'].map((key) => ContentKey.parse(key)),
      unmatched: [{ phrasing: 'an ally is about to use an action', count: 2 }],
    });
  });

  test('an empty pack has nothing to cover', () => {
    expect(triggerCoverage([])).toStrictEqual({ triggered: 0, withoutEvent: [], unmatched: [] });
  });

  test('groups unmatched wordings, most common first, ties alphabetically', () => {
    const entries = [
      entry('a', 'action', wording('You are hit.')),
      entry('b', 'action', wording('An ally falls.')),
      entry('c', 'action', wording('you are  hit')),
      entry('d', 'action', wording('A trap springs.')),
      entry('e', 'action', { ...wording('Your turn begins.'), ...turnStart }),
    ];

    expect(triggerCoverage(entries).unmatched).toStrictEqual([
      { phrasing: 'you are hit', count: 2 },
      { phrasing: 'a trap springs', count: 1 },
      { phrasing: 'an ally falls', count: 1 },
    ]);
  });
});
