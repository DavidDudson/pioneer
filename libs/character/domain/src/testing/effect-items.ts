import { ContentKind } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

/** A held sword whose Strikes add 1d6 fire precision damage and a note on a critical success. */
export const EMBER_BLADE: MagicItemFields & { readonly kind: ContentKind } = {
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
      key: 'DamageDice',
      selectors: ['strike-damage'],
      diceNumber: 1,
      dieSize: 'd6',
      damageType: 'fire',
      category: 'precision',
    },
    {
      key: 'Note',
      selectors: ['strike-attack-roll'],
      title: 'Embers',
      text: [{ type: 'paragraph', content: [{ type: 'text', text: 'The target catches fire.' }] }],
      outcome: ['criticalSuccess'],
    },
  ],
};

/** A worn invested charm whose alterations add 3 to a shield's Hardness and give weapons cold iron, agile and flaming. */
export const BULWARK_CHARM: MagicItemFields & { readonly kind: ContentKind } = {
  kind: ContentKind.Equipment,
  data: { bulk: 'light', usage: { type: 'worn', slot: 'necklace' } },
  traits: ['invested', 'magical'],
  rules: [
    { key: 'ItemAlteration', items: ['item:type:shield'], property: 'hardness', mode: 'add', value: 3 },
    { key: 'ItemAlteration', items: ['item:type:weapon'], property: 'materials', mode: 'add', value: 'cold-iron' },
    { key: 'ItemAlteration', items: ['item:type:weapon'], property: 'traits', mode: 'add', value: 'agile' },
    { key: 'ItemAlteration', items: ['item:type:weapon'], property: 'property-runes', mode: 'add', value: 'flaming' },
  ],
};

/** A worn invested charm that gives fast healing 2, 4 temporary Hit Points and one size larger. */
export const TROLL_CHARM: MagicItemFields & { readonly kind: ContentKind } = {
  kind: ContentKind.Equipment,
  data: { bulk: 'light', usage: { type: 'worn', slot: 'necklace' } },
  traits: ['invested', 'magical'],
  rules: [
    { key: 'FastHealing', value: 2, deactivatedBy: ['fire'] },
    { key: 'TempHP', value: 4 },
    { key: 'CreatureSize', value: 1 },
  ],
};
