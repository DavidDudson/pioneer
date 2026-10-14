import { ContentKind } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

/**
 * A worn invested cloak that offers a toggle and two conditional bonuses to Perception: +1 circumstance against
 * undead, and +2 status while the toggle sets `self:effect:hunters-focus`.
 */
export const HUNTERS_CLOAK: MagicItemFields & { readonly kind: ContentKind } = {
  kind: ContentKind.Equipment,
  data: { bulk: 'light', usage: { type: 'worn', slot: 'cloak' } },
  traits: ['invested', 'magical'],
  rules: [
    { key: 'RollOption', option: 'self:effect:hunters-focus', toggleable: true, value: false },
    {
      key: 'FlatModifier',
      selectors: ['perception'],
      type: 'circumstance',
      value: 1,
      predicate: ['target:trait:undead'],
    },
    {
      key: 'FlatModifier',
      selectors: ['perception'],
      type: 'status',
      value: 2,
      predicate: ['self:effect:hunters-focus'],
    },
  ],
};
