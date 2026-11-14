import { ContentKind } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

type ItemFixtureFields = MagicItemFields & { readonly kind: ContentKind };

/** Consumables a weapon can be coated with: an oil, a heavy oil that fills a coating rune's space, an injury poison. */
export const CoatingFixture = {
  WeaponOil: 'weapon-oil',
  HeavyOil: 'heavy-oil',
  InjuryPoison: 'injury-poison',
} as const;

/** An oil, light. */
const WEAPON_OIL: ItemFixtureFields = {
  kind: ContentKind.Consumable,
  data: { bulk: 'light', category: 'oil' },
};

/** An oil of 1 Bulk, which fills a coating rune's space on its own. */
const HEAVY_OIL: ItemFixtureFields = { kind: ContentKind.Consumable, data: { bulk: 1, category: 'oil' } };

/** A light poison with the injury trait. */
const INJURY_POISON: ItemFixtureFields = {
  kind: ContentKind.Consumable,
  traits: ['injury', 'poison'],
  data: { bulk: 'light', category: 'poison' },
};

/** The coating fixtures, by id. */
export const COATING_ITEMS = {
  [CoatingFixture.WeaponOil]: WEAPON_OIL,
  [CoatingFixture.HeavyOil]: HEAVY_OIL,
  [CoatingFixture.InjuryPoison]: INJURY_POISON,
} as const;
