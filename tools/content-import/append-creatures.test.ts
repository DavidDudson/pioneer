import { describe, expect, test } from 'bun:test';

import { BacklogGapType, BacklogItemType } from '@pioneer/interop/foundry';
import type { BacklogItem } from '@pioneer/interop/foundry';
import { ContentId, ContentKind, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { creaturesOf, mergeCreatures, withCreatureBacklog } from './append-creatures.ts';

const pack = PackId.parse('bestiary-1');
const otherPack = PackId.parse('bestiary-2');
const FIRST = ContentId.parse('00000000-0000-5000-8000-000000000001');
const SECOND = ContentId.parse('00000000-0000-5000-8000-000000000002');
const THIRD = ContentId.parse('00000000-0000-5000-8000-000000000003');

interface Where {
  readonly kind?: ContentKind;
  readonly from?: PackId;
}

function entry(id: ContentId, slug: string, { kind = ContentKind.Creature, from = pack }: Where = {}): ContentEntry {
  // SAFETY: the test entry holds only the fields the helpers read (id, pack, kind and slug), not the rest of a content entry.
  return { id, pack: from, kind, slug } as ContentEntry;
}

const gap = { type: BacklogGapType.Enricher, enricher: '@UUID[spells-srd]' } as const;

function item(slug: string, from = pack): BacklogItem {
  return { type: BacklogItemType.Entry, pack: from, slug: EntrySlug.parse(slug), gaps: [gap] };
}

describe('creaturesOf', () => {
  test('keeps the creatures of the pack, not its other kinds or another pack’s creatures', () => {
    const entries = [
      entry(FIRST, 'creature:goblin'),
      entry(SECOND, 'creature:goblin-boss', { kind: ContentKind.Action }),
      entry(THIRD, 'creature:owlbear', { from: otherPack }),
    ];

    expect(creaturesOf(entries, pack).map(({ id }) => id)).toEqual([FIRST]);
  });
});

describe('mergeCreatures', () => {
  test('adds the creatures the pack lacks, keeps a committed one as it is, and sorts by slug', () => {
    const committed = [entry(SECOND, 'creature:owlbear')];
    const merge = mergeCreatures(committed, [entry(THIRD, 'creature:owlbear'), entry(FIRST, 'creature:goblin')]);

    expect(merge.added).toBe(1);
    expect(merge.entries.map(({ id }) => id)).toEqual([FIRST, SECOND]);
  });

  test('adds nothing for a run that brings no new creature', () => {
    const committed = [entry(FIRST, 'creature:goblin')];

    expect(mergeCreatures(committed, committed)).toEqual({ entries: committed, added: 0 });
  });
});

describe('withCreatureBacklog', () => {
  test('adds the items of creatures not yet committed, left out ones included, and keeps the rest', () => {
    const existing = [item('action:strike')];

    const fresh = [
      item('creature:goblin'),
      item('creature:triton'),
      item('action:other'),
      item('creature:ogre', otherPack),
    ];

    const backlog = withCreatureBacklog(existing, fresh, { pack, committed: new Set() });

    expect(backlog).toEqual([item('action:strike'), item('creature:goblin'), item('creature:triton')]);
  });

  test('leaves the backlog of a committed creature alone', () => {
    const existing = [item('creature:goblin')];

    const backlog = withCreatureBacklog(existing, [item('creature:goblin')], {
      pack,
      committed: new Set(['creature:goblin']),
    });

    expect(backlog).toEqual(existing);
  });
});
