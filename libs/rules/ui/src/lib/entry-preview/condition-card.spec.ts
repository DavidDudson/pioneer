import { ConditionValue, ContentId, ContentKind, ContentRegistry, RichText } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { atValue, conditionCard } from './condition-card';
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
  .withCondition('wobbly', [], { valued: true, values: { kind: 'formula', text: TEXT } })
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

  it('offers no way to ease it, as the reader holds nothing', () => {
    const card = conditionCard(entryNamed(ContentKind.Condition, 'dazed'), CARD, () => undefined);

    expect(card.easeOptions).toBeUndefined();
  });

  it('carries what each value of a valued condition means', () => {
    const card = conditionCard(entryNamed(ContentKind.Condition, 'wobbly'), CARD, () => undefined);

    expect(card.values).toStrictEqual({ kind: 'formula', text: TEXT });
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

describe(atValue, () => {
  const VALUE = ConditionValue.parse(2);
  const valued: EntryPreview = {
    ...CARD,
    valued: true,
    endings: [
      { kind: 'check', text: TEXT, dc: 10, dcByValue: true, against: [] },
      { kind: 'check', text: TEXT, dc: 15, against: [] },
    ],
  };

  it('shows the value beside the name and works a DC that follows it out at that value', () => {
    const card = atValue(valued, VALUE);

    expect(card.value).toBe(2);
    expect(card.endings?.map(({ dc }) => dc)).toStrictEqual([12, 15]);
  });

  it('leaves a card that carries no value, or a mention that names none, as it is', () => {
    expect(atValue(CARD, VALUE)).toBe(CARD);
    expect(atValue(valued, undefined)).toBe(valued);
  });

  it("leaves the character's own value as it is", () => {
    const own: EntryPreview = { ...valued, value: ConditionValue.parse(3) };

    expect(atValue(own, VALUE)).toBe(own);
  });
});
