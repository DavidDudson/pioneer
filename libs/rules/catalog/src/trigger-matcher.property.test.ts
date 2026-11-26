import { describe, expect, test } from 'bun:test';

import { ContentId, contentId, EntrySlug, PackId, RichText } from '@pioneer/rules/sdk';
import { array, assert, constant, oneof, property, string } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { matchTrigger, triggerPhrasing } from './trigger-matcher';

const LINKED = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('action:strike')));
const NODES_MAX = 6;
const BLOCKS_MAX = 3;

const inline: Arbitrary<object> = oneof(
  string({ minLength: 1 }).map((text) => ({ type: 'text', text })),
  string({ minLength: 1 }).map((label) => ({ type: 'ref', id: LINKED, label })),
  constant({ type: 'ref', id: LINKED }),
  constant({ type: 'action-cost', cost: 'one' }),
);

const paragraph: Arbitrary<object> = array(inline, { minLength: 1, maxLength: NODES_MAX }).map((content) => ({
  type: 'paragraph',
  content,
}));

const richText: Arbitrary<RichText> = array(paragraph, { maxLength: BLOCKS_MAX }).map((blocks) =>
  RichText.parse(blocks),
);

describe('trigger matcher (properties)', () => {
  test('matching never throws on arbitrary rich text', () => {
    assert(
      property(richText, (trigger) => {
        expect(() => matchTrigger(trigger, new Map())).not.toThrow();
      }),
    );
  });

  test('a phrasing is lowercase and has no run of spaces', () => {
    assert(
      property(richText, (trigger) => {
        const phrasing = triggerPhrasing(trigger, new Map());

        expect(phrasing).toBe(phrasing.toLowerCase());
        expect(phrasing).not.toMatch(/ {2}/u);
      }),
    );
  });
});
