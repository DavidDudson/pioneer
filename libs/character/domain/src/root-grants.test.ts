import { describe, expect, test } from 'bun:test';

import { ChoiceValue, ContentKind, ContentRegistry, Level, RuleElementKey, SlotKey } from '@pioneer/rules/sdk';
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
      picks: new Map([...picks].map(([key, value]) => [SlotKey.parse(key), ChoiceValue.parse(value)])),
    });
    expect(resolution.errors).toEqual([]);
    const granted = resolution.items.map((item) => `${item.entry.kind}: ${item.entry.name}`);
    expect(granted.toSorted((left, right) => left.localeCompare(right))).toEqual([
      'ancestry: Human',
      'background: Farmhand',
      'feat: Assurance',
      'heritage: Skilled-human',
    ]);
    const farmhand = resolution.items.find((item) => item.entry.kind === ContentKind.Background);
    expect(farmhand?.entry.rules).toMatchObject([
      { key: RuleElementKey.Proficiency, selector: 'skill:athletics', rank: 'trained' },
      { key: RuleElementKey.Proficiency, selector: 'skill:lore:farming', rank: 'trained' },
      { key: RuleElementKey.GrantItem },
    ]);
  });
});
