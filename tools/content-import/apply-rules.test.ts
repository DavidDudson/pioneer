import { describe, expect, test } from 'bun:test';

import { BacklogGapType, BacklogItemType } from '@pioneer/interop/foundry';
import type { BacklogItem } from '@pioneer/interop/foundry';
import { ContentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentEntry, RuleElement } from '@pioneer/rules/sdk';

import { clearAppliedGaps, gappedEntries, mergeRules, withMergedRules } from './apply-rules.ts';

const pack = PackId.parse('player-core');
const slug = EntrySlug.parse('feat:x');
const ID = ContentId.parse('00000000-0000-5000-8000-000000000001');
const OTHER = ContentId.parse('00000000-0000-5000-8000-000000000002');
const KEYS: ReadonlySet<string> = new Set(['FlatModifier']);
const GAPPED: ReadonlySet<string> = new Set([`${pack}/${slug}`]);

const toggle = { key: 'RollOption', option: 'a:b' } as unknown as RuleElement;
const modifier = { key: 'FlatModifier', selectors: ['ac'], type: 'item', value: 1 } as unknown as RuleElement;
const proficiency = { key: 'Proficiency', selector: 'skill:athletics', rank: 'trained' } as unknown as RuleElement;

function entry(id: ContentId, rules: readonly RuleElement[]): ContentEntry {
  return { id, pack, slug, rules } as unknown as ContentEntry;
}

const ruleGap = { type: BacklogGapType.Rule, key: 'FlatModifier', raw: { key: 'FlatModifier' } } as const;
const enricher = { type: BacklogGapType.Enricher, enricher: '@UUID[spells-srd]' } as const;
function item(gaps: readonly (typeof ruleGap | typeof enricher)[]): BacklogItem {
  return { type: BacklogItemType.Entry, pack, slug, gaps } as BacklogItem;
}

describe('mergeRules', () => {
  test('appends the import’s rules of the keys to an entry the backlog lists with a gap of one', () => {
    const merge = mergeRules([entry(ID, [toggle])], [entry(ID, [toggle, modifier])], GAPPED, KEYS);

    expect(merge.get(ID)).toEqual([toggle, modifier]);
  });

  test('leaves out rules of other keys, and rules the entry holds already', () => {
    const merge = mergeRules([entry(ID, [modifier])], [entry(ID, [modifier, proficiency])], GAPPED, KEYS);

    expect(merge.size).toBe(0);
  });

  test('leaves an entry the backlog does not list with such a gap as it is', () => {
    const merge = mergeRules([entry(ID, [])], [entry(ID, [modifier])], new Set(), KEYS);

    expect(merge.size).toBe(0);
  });

  test('withMergedRules replaces only the rules of entries that gained some', () => {
    const merge = mergeRules([entry(ID, []), entry(OTHER, [])], [entry(ID, [modifier])], GAPPED, KEYS);

    expect(
      withMergedRules(
        [
          { id: ID, name: 'a', rules: [] },
          { id: OTHER, rules: [] },
        ],
        merge,
      ),
    ).toEqual([
      { id: ID, name: 'a', rules: [modifier] },
      { id: OTHER, rules: [] },
    ]);
  });
});

describe('gappedEntries', () => {
  test('lists the entries with a rule gap of one of the keys', () => {
    expect(gappedEntries([item([ruleGap, enricher])], KEYS)).toEqual(GAPPED);
    expect(gappedEntries([item([enricher])], KEYS)).toEqual(new Set());
    expect(gappedEntries([item([ruleGap])], new Set(['Resistance']))).toEqual(new Set());
  });
});

describe('clearAppliedGaps', () => {
  test('drops the rule gaps the import no longer reports, and the item once nothing is left', () => {
    expect(clearAppliedGaps([item([ruleGap, enricher])], [item([enricher])], GAPPED, KEYS)).toEqual([item([enricher])]);
    expect(clearAppliedGaps([item([ruleGap])], [], GAPPED, KEYS)).toEqual([]);
  });

  test('keeps the gaps of an entry that gained nothing, and gaps the import still reports', () => {
    expect(clearAppliedGaps([item([ruleGap])], [], new Set(), KEYS)).toEqual([item([ruleGap])]);
    expect(clearAppliedGaps([item([ruleGap])], [item([ruleGap])], GAPPED, KEYS)).toEqual([item([ruleGap])]);
  });
});
