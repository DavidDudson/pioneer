import { ContentKind } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

type ItemFixtureFields = MagicItemFields & { readonly kind: ContentKind };

const TONIC = {
  bulk: 'light',
  category: 'potion',
  usage: { type: 'held', hands: 'one' },
} as const;

/** A potion that heals 1d8, 10 and the drinker's level. */
export const LEVEL_TONIC: ItemFixtureFields = {
  kind: ContentKind.Consumable,
  data: { ...TONIC, damage: { formula: '1d8 + 10 + @level', kind: 'healing' } },
};

/** A potion whose healing reads the value of an item, which no character has. */
export const UNREADABLE_TONIC: ItemFixtureFields = {
  kind: ContentKind.Consumable,
  data: { ...TONIC, damage: { formula: '1d8 + @item.value', kind: 'healing' } },
};
