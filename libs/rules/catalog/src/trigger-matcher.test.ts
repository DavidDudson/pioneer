import { describe, expect, test } from 'bun:test';

import {
  ContentEntry,
  ContentId,
  contentId,
  ContentKey,
  ContentText,
  EntrySlug,
  PackId,
  RichText,
  TriggerEvent,
} from '@pioneer/rules/sdk';
import type { JsonObject } from '@pioneer/rules/sdk/testing';

import { matchTrigger, triggerMatches, triggerPhrasing } from './trigger-matcher';
import type { RefNames } from './trigger-matcher';

const PACK = 'player-core';
const idOf = (slug: string): ContentId => ContentId.parse(contentId(PackId.parse(PACK), EntrySlug.parse(slug)));
const STRIKE = idOf('action:strike');
const NAMES: RefNames = new Map([[STRIKE, ContentText.parse('Strike')]]);

const text = (words: string): JsonObject => ({ type: 'text', text: words });
const paragraph = (...content: readonly JsonObject[]): JsonObject => ({ type: 'paragraph', content });
const trigger = (...blocks: readonly JsonObject[]): RichText => RichText.parse(blocks);
const prose = (words: string): RichText => trigger(paragraph(text(words)));

const ref = (id: ContentId, label?: string): JsonObject =>
  label === undefined ? { type: 'ref', id } : { type: 'ref', id, label };

const OTHER = idOf('action:other');
const TWO_PARAGRAPHS = trigger(paragraph(text('Your turn begins.')), paragraph(text('Your turn ends.')));
const WITH_GLYPH = trigger(paragraph(text('You cast a spell '), { type: 'action-cost', cost: 'one' }));

const event = (value: JsonObject): TriggerEvent => TriggerEvent.parse(value);

describe('trigger matcher', () => {
  test.each([
    ['You roll initiative.', { event: 'initiative' }],
    ['Your turn begins.', { event: 'turn-start' }],
    ['You begin your turn.', { event: 'turn-start' }],
    ['At the start of your turn', { event: 'turn-start' }],
    ['The start of your turn.', { event: 'turn-start' }],
    ['Your turn ends.', { event: 'turn-end' }],
    ['You end your turn.', { event: 'turn-end' }],
    ['At the end of your turn.', { event: 'turn-end' }],
    ['The end of your turn.', { event: 'turn-end' }],
    ['You cast a spell.', { event: 'cast-spell' }],
    ['You cast a focus spell.', { event: 'cast-spell', predicate: ['item:trait:focus'] }],
    ['You cast a cantrip.', { event: 'cast-spell', predicate: ['item:trait:cantrip'] }],
    ['You Strike.', { event: 'strike' }],
    ['You make a Strike.', { event: 'strike' }],
    ['You attempt a Strike.', { event: 'strike' }],
    ['You take damage.', { event: 'damage-taken' }],
    ['You are dealt damage.', { event: 'damage-taken' }],
    ['You roll for initiative.', { event: 'initiative' }],
    ['You start your turn.', { event: 'turn-start' }],
    ['Your turn starts.', { event: 'turn-start' }],
    ['You finish your turn.', { event: 'turn-end' }],
    ['You finish casting a spell.', { event: 'cast-spell' }],
  ])('reads "%s"', (words, expected) => {
    expect(matchTrigger(prose(words), NAMES)).toStrictEqual(event(expected));
  });

  test('ignores case, spacing and the full stop', () => {
    expect(matchTrigger(prose('  you  CAST a\nfocus spell '), NAMES)).toStrictEqual(
      event({ event: 'cast-spell', predicate: ['item:trait:focus'] }),
    );
    expect(matchTrigger(prose('Your turn ends'), NAMES)).toStrictEqual(event({ event: 'turn-end' }));
  });

  test('reads a link by its label, or by the name of the entry it links to', () => {
    const linked = trigger(paragraph(text('You '), ref(STRIKE), text('.')));
    const labelled = trigger(paragraph(text('You make a '), ref(OTHER, 'Strike')));
    const unnamed = trigger(paragraph(text('You '), ref(OTHER)));
    const strike = event({ event: 'strike' });

    expect(matchTrigger(linked, NAMES)).toStrictEqual(strike);
    expect(matchTrigger(labelled, NAMES)).toStrictEqual(strike);
    expect(matchTrigger(unnamed, NAMES)).toBeUndefined();
  });

  test('reads marked words as their text', () => {
    const focus = { type: 'text', text: 'focus', marks: ['emphasis'] };
    const marked = trigger(paragraph(text('You cast a '), focus, text(' spell.')));

    expect(matchTrigger(marked, NAMES)).toStrictEqual(event({ event: 'cast-spell', predicate: ['item:trait:focus'] }));
  });

  test.each([
    ['a condition the event cannot carry', prose('You Strike a creature that is off-guard.')],
    ['a hit rather than a Strike', prose('You are hit by a Strike.')],
    ['a condition on the damage', prose('You take damage from a Strike or spell.')],
    ['a condition on the spell', prose('You cast a non-cantrip spell that targets only your animal companion.')],
    ['another creature’s action', prose('A creature within your reach uses a move action.')],
    ['an unknown wording', prose('constructor')],
    ['more than one paragraph', TWO_PARAGRAPHS],
    ['a node richer than words', WITH_GLYPH],
  ])('leaves %s unmatched', (_name, words) => {
    expect(matchTrigger(words, NAMES)).toBeUndefined();
  });
});

/** A Player Core entry of `kind` with `data`. */
function entry(name: string, kind: string, data: JsonObject): ContentEntry {
  const slug = `${kind}:${name}`;

  const fields = {
    id: idOf(slug),
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

  return ContentEntry.parse(kind === 'action' ? fields : { ...fields, level: 1 });
}

/** An action's trigger fields. */
const triggered = (words: string, extra: JsonObject = {}): JsonObject => ({
  cost: 'reaction',
  trigger: prose(words),
  ...extra,
});

describe('trigger matches', () => {
  test('reads actions and the actions feats and class features are', () => {
    const entries = [
      entry('steady', 'action', triggered('Your turn begins.')),
      entry('swift', 'feat', { category: 'class', action: triggered('You roll initiative.') }),
      entry('focused', 'class-feature', { action: triggered('You cast a focus spell.') }),
    ];

    expect(triggerMatches(entries, NAMES)).toStrictEqual([
      { entry: ContentKey.parse('player-core/action:steady'), triggerEvent: event({ event: 'turn-start' }) },
      { entry: ContentKey.parse('player-core/feat:swift'), triggerEvent: event({ event: 'initiative' }) },
      {
        entry: ContentKey.parse('player-core/class-feature:focused'),
        triggerEvent: event({ event: 'cast-spell', predicate: ['item:trait:focus'] }),
      },
    ]);
  });

  test('keeps an event already set, and skips requirements and what has no trigger or no match', () => {
    const entries = [
      entry('corrected', 'action', triggered('Your turn begins.', { triggerEvent: { event: 'turn-end' } })),
      entry('untriggered', 'action', { cost: 'one' }),
      entry('unmatched', 'action', triggered('An ally is about to use an action.')),
      entry('passive', 'feat', { category: 'general' }),
      entry(
        'shielded',
        'action',
        triggered('Your turn begins.', { requirementsText: prose('Your shield is raised.') }),
      ),
    ];

    expect(triggerMatches(entries, NAMES)).toStrictEqual([]);
  });
});

describe('trigger phrasing', () => {
  test('normalises case, spacing and the full stop, and names links', () => {
    const linked = trigger(paragraph(text('  You  USE '), ref(STRIKE), text('.')));

    expect(triggerPhrasing(linked, NAMES)).toBe('you use strike');
  });

  test('marks what is not words, and joins paragraphs', () => {
    const unnamed = trigger(paragraph(text('You use '), ref(OTHER)));

    expect(triggerPhrasing(WITH_GLYPH, NAMES)).toBe('you cast a spell <…>');
    expect(triggerPhrasing(unnamed, NAMES)).toBe('you use <…>');
    expect(triggerPhrasing(TWO_PARAGRAPHS, NAMES)).toBe('your turn begins / your turn ends');
  });
});
