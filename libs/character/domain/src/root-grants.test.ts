import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry, Level, RuleElementKey, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { ANCESTRY_SLOT, BACKGROUND_SLOT, HERITAGE_SLOT } from './character-slots';
import { resolveSlotsAt, slotContent } from './slot-offer';

const pack = new ContentPackBuilder()
  .withId('player-core')
  .withAncestry('human')
  .withHeritage('skilled-human', 'human')
  .withFeat('assurance');
pack.withBackground(
  'farmhand',
  [['con', 'wis']],
  [
    { key: 'Proficiency', selector: 'skill:athletics', rank: 'trained' },
    { key: 'Proficiency', selector: 'skill:lore:farming', rank: 'trained' },
    { key: 'GrantItem', item: pack.idOf(ContentKind.Feat, 'assurance') },
  ],
);
const registry = new ContentRegistry();
registry.register(pack.build());

describe('the character’s own slots', () => {
  test('an ancestry, its heritage and a background enter the effective set, with what the background grants', () => {
    const picks = new Map([
      [ANCESTRY_SLOT, pack.idOf(ContentKind.Ancestry, 'human')],
      [HERITAGE_SLOT, pack.idOf(ContentKind.Heritage, 'skilled-human')],
      [BACKGROUND_SLOT, pack.idOf(ContentKind.Background, 'farmhand')],
    ]);
    const resolution = resolveSlotsAt(Level.parse(1), {
      ...slotContent(registry),
      picks: new Map([...picks].map(([key, value]) => [SlotKey.parse(key), value])),
    });
    expect(resolution.errors).toEqual([]);
    const granted = resolution.items.map((item) => [item.entry.kind, String(item.entry.name)]);
    expect(granted.toSorted()).toEqual([
      [ContentKind.Ancestry, 'Human'],
      [ContentKind.Background, 'Farmhand'],
      [ContentKind.Feat, 'Assurance'],
      [ContentKind.Heritage, 'Skilled-human'],
    ]);
    const farmhand = resolution.items.find((item) => item.entry.kind === ContentKind.Background);
    const trained = farmhand?.entry.rules.filter((rule) => rule.key === RuleElementKey.Proficiency);
    expect(trained?.map((rule) => ('selector' in rule ? rule.selector : undefined))).toEqual([
      'skill:athletics',
      'skill:lore:farming',
    ]);
  });
});
