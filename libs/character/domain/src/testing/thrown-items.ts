import { ContentKind } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

type ItemFixtureFields = MagicItemFields & { readonly kind: ContentKind };

/** A thrown bomb in a stack: 1d8 fire, 1 persistent fire and 1 splash, range increment 20 feet. */
export const ALCHEMISTS_FIRE: ItemFixtureFields = {
  kind: ContentKind.Weapon,
  data: {
    bulk: 'light',
    category: 'simple',
    group: 'bomb',
    damage: { dice: 1, die: 'd8', damageType: 'fire', persistent: { formula: '1', damageType: 'fire' } },
    splash: 1,
    range: 20,
    usage: { type: 'held', hands: 'one' },
  },
  traits: ['alchemical', 'bomb', 'consumable', 'fire', 'splash'],
};

/** Holy water, a thrown consumable of 1d6 spirit with 1 splash. */
export const HOLY_WATER: ItemFixtureFields = {
  kind: ContentKind.Weapon,
  data: {
    bulk: 'light',
    category: 'simple',
    damage: { dice: 1, die: 'd6', damageType: 'spirit' },
    splash: 1,
    range: 20,
    usage: { type: 'held', hands: 'one' },
  },
  traits: ['consumable', 'divine', 'holy', 'splash', 'thrown'],
};
