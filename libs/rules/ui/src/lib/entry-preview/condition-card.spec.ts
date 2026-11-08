import { ContentId, ContentKind, ContentRegistry, RichText } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { conditionCard } from './condition-card';
import type { EntryPreview } from './entry-preview';

const TEXT = RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'Rest ends it.' }] }]);
const CARD: EntryPreview = {
  name: 'Dazed' as EntryPreview['name'],
  level: undefined,
  traits: [],
  summary: TEXT,
  sources: [],
};

const pack = new ContentPackBuilder()
  .withId('condition-card')
  .withCondition('dazed', [], {
    recovery: [{ kind: 'automatic', trigger: 'rest', change: { effect: 'remove' }, text: TEXT }],
  })
  .withCondition('plain')
  .withFeat('toughness');
const registry = new ContentRegistry();
registry.register(pack.build());

function entryNamed(kind: ContentKind, name: string): ContentEntry {
  const id = ContentId.parse(pack.idOf(kind, name));
  const found = registry.packs.flatMap((each) => each.otherEntries).find((entry) => entry.id === id);
  if (found === undefined) {
    throw new Error(`no ${kind} ${name}`);
  }
  return found;
}

describe(conditionCard, () => {
  it('adds the ways a condition ends to its card', () => {
    const card = conditionCard(entryNamed(ContentKind.Condition, 'dazed'), CARD, () => undefined);

    expect(card.endings?.map(({ kind }) => kind)).toStrictEqual(['automatic']);
  });

  it('names no entry as held, as the reader holds none', () => {
    const card = conditionCard(entryNamed(ContentKind.Condition, 'dazed'), CARD, () => undefined);

    expect(card.endings?.every(({ held }) => held.length === 0)).toBe(true);
  });

  it('leaves the card of a condition with no endings as it is', () => {
    const card = conditionCard(entryNamed(ContentKind.Condition, 'plain'), CARD, () => undefined);

    expect(card).toBe(CARD);
  });

  it('leaves the card of an entry that is no condition as it is', () => {
    const card = conditionCard(entryNamed(ContentKind.Feat, 'toughness'), CARD, () => undefined);

    expect(card).toBe(CARD);
  });
});
