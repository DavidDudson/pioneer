import { describe, expect, test } from 'bun:test';

import { BacklogItemType, VocabularyGapReason } from '@pioneer/interop/foundry';
import type { BacklogItem } from '@pioneer/interop/foundry';
import { ContentKind } from '@pioneer/rules/sdk';

import { DESCRIBED_KINDS, withDescriptionGaps, withFilledDescriptions } from './apply-descriptions.ts';

const TRAIT = 'trait-id';
const LANGUAGE = 'language-id';
const WRITTEN = [{ type: 'paragraph', content: [{ type: 'text', text: 'Written by hand.' }] }];
const FRESH = [{ type: 'paragraph', content: [{ type: 'text', text: 'From Foundry.' }] }];

function entry(id: string, kind: string, description: readonly unknown[]): Record<string, unknown> {
  return { id, kind, name: 'X', description };
}

describe('withFilledDescriptions', () => {
  test('fills an empty trait description with the import’s', () => {
    const merge = withFilledDescriptions([entry(TRAIT, 'trait', [])], new Map([[TRAIT, FRESH]]), DESCRIBED_KINDS);

    expect(merge.entries).toEqual([entry(TRAIT, 'trait', FRESH)]);
    expect(merge.filled).toBe(1);
  });

  test('keeps a description the entry holds, hand-written or not', () => {
    const merge = withFilledDescriptions([entry(TRAIT, 'trait', WRITTEN)], new Map([[TRAIT, FRESH]]), DESCRIBED_KINDS);

    expect(merge.entries).toEqual([entry(TRAIT, 'trait', WRITTEN)]);
    expect(merge.filled).toBe(0);
  });

  test('leaves an entry the import gives no text for, or does not hold, empty', () => {
    const merge = withFilledDescriptions(
      [entry(TRAIT, 'trait', []), entry('other', 'trait', [])],
      new Map([[TRAIT, []]]),
      DESCRIBED_KINDS,
    );

    expect(merge.entries).toEqual([entry(TRAIT, 'trait', []), entry('other', 'trait', [])]);
    expect(merge.filled).toBe(0);
  });

  test('leaves entries of other kinds alone', () => {
    const merge = withFilledDescriptions(
      [entry(LANGUAGE, 'language', [])],
      new Map([[LANGUAGE, FRESH]]),
      DESCRIBED_KINDS,
    );

    expect(merge.entries).toEqual([entry(LANGUAGE, 'language', [])]);
    expect(merge.filled).toBe(0);
  });
});

function gap(kind: ContentKind, slug: string, reason: VocabularyGapReason): BacklogItem {
  return { type: BacklogItemType.Vocabulary, kind, slug, reason, detail: slug };
}

describe('withDescriptionGaps', () => {
  const unmapped = gap(ContentKind.DamageType, 'untyped', VocabularyGapReason.UnmappedValue);

  test('replaces the committed missing-description items of the kind with the import’s, in vocabulary order', () => {
    const stale = gap(ContentKind.Trait, 'reckless', VocabularyGapReason.MissingDescription);
    const still = gap(ContentKind.Trait, 'couatl', VocabularyGapReason.MissingDescription);

    expect(withDescriptionGaps([unmapped, stale], [still], DESCRIBED_KINDS)).toEqual([unmapped, still]);
  });

  test('keeps the other backlog items as they were', () => {
    const named = gap(ContentKind.Language, 'gibberish', VocabularyGapReason.MissingDescription);

    expect(withDescriptionGaps([unmapped, named], [], DESCRIBED_KINDS)).toEqual([unmapped, named]);
  });
});
