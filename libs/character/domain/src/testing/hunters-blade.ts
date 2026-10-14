import { ContentKind } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

/** A held sword with a conditional bonus to its attack rolls: +2 circumstance to the attack against undead. */
export const HUNTERS_BLADE: MagicItemFields & { readonly kind: ContentKind } = {
  kind: ContentKind.Weapon,
  data: {
    bulk: 1,
    category: 'martial',
    group: 'sword',
    damage: { dice: 1, die: 'd8', damageType: 'slashing' },
    usage: { type: 'held', hands: 'one' },
  },
  traits: ['magical'],
  rules: [
    {
      key: 'FlatModifier',
      selectors: ['attack-roll'],
      type: 'circumstance',
      value: 2,
      predicate: ['target:trait:undead'],
    },
  ],
};
