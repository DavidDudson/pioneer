import { describe, expect, test } from 'bun:test';

import { ContentEntry, contentId, ContentKey, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { triggerCoverage } from './trigger-coverage';

const PACK = 'player-core';
const prose = (words: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text: words }] }];

/** A Player Core entry of `kind` with `data`. */
function entry(name: string, kind: string, data: object): ContentEntry {
  const slug = `${kind}:${name}`;
  return ContentEntry.parse({
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
    ...(kind === 'action' || kind === 'effect' ? {} : { level: 1 }),
    data,
  });
}

const reaction = { cost: 'reaction', trigger: prose('An ally is about to use an action.') };
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
    });
  });

  test('an empty pack has nothing to cover', () => {
    expect(triggerCoverage([])).toStrictEqual({ triggered: 0, withoutEvent: [] });
  });
});
