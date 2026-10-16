import { contentId, EntrySlug, RuleElementKey } from '@pioneer/rules/sdk';

import { DRUID, DRUID_ENTRY, focusChoice } from './focus-plan';
import type { Grant, Planned } from './focus-plan';

/** A druid's order by its feature's slug, its name and its order spell. */
export const ORDERS: readonly (readonly [string, string, string])[] = [
  ['animal-order', 'Animal Order', 'heal-animal'],
  ['leaf-order', 'Leaf Order', 'cornucopia'],
  ['storm-order', 'Storm Order', 'tempest-surge'],
  ['untamed-order', 'Untamed Order', 'untamed-shift'],
];

export const ORDER_EXPLORER = 'feat:order-explorer';
const DRUID_DEDICATION = 'feat:druid-dedication';
const SELECT_ORDER = 'Select a druidic order.';

/**
 * Order Explorer (ADR-0050): a druidic order other than the druid's own, which the druid joins for feat prerequisites
 * and nothing else. The pick sets `feat:order-explorer:<order>`, which every order's benefits read as Foundry does,
 * and grants the order's feature. An order the druid has is not offered, unless Order Explorer joined it.
 */
export const ORDER_EXPLORER_RULES: Planned = [
  (pack) => ({
    key: RuleElementKey.ChoiceSet,
    flag: 'order',
    rollOption: ORDER_EXPLORER,
    prompt: SELECT_ORDER,
    choices: ORDERS.map(([slug, label]) => ({
      value: contentId(pack, EntrySlug.parse(`class-feature:${slug}`)),
      label,
      predicate: [{ or: [{ not: `feature:${slug}` }, `${ORDER_EXPLORER}:${slug}`] }],
    })),
  }),
  { key: RuleElementKey.GrantItem, item: { choice: 'order' } },
];

/** Order Magic: the order spell of an order Order Explorer joined. */
export const ORDER_MAGIC_RULES: Planned = [
  DRUID_ENTRY,
  ...focusChoice({
    flag: 'order-magic',
    prompt: SELECT_ORDER,
    entry: DRUID,
    options: ORDERS.map(([slug, label, spell]) => ({
      value: slug,
      label,
      spells: [spell],
      predicate: [`${ORDER_EXPLORER}:${slug}`],
    })),
  }),
];

/**
 * Druid Dedication: the druidic order the archetype joins, which counts for prerequisites and grants no order spell
 * until Order Spell does. The pick sets `feat:druid-dedication:<order>` and grants the order's feature.
 */
export const DRUID_DEDICATION_RULES: Planned = [
  (pack) => ({
    key: RuleElementKey.ChoiceSet,
    flag: 'order',
    rollOption: DRUID_DEDICATION,
    prompt: SELECT_ORDER,
    choices: ORDERS.map(([slug, label]) => ({
      value: contentId(pack, EntrySlug.parse(`class-feature:${slug}`)),
      label,
    })),
  }),
  { key: RuleElementKey.GrantItem, item: { choice: 'order' } },
];

/** Order Spell: the initial order spell of the order Druid Dedication joined. */
export const ORDER_SPELL_RULES: Planned = [
  DRUID_ENTRY,
  ...ORDERS.map(([slug, , spell]): Grant => ({
    entry: DRUID,
    spells: [spell],
    predicate: [`${DRUID_DEDICATION}:${slug}`],
  })),
];

/**
 * A druid's order: its order spell, unless the order was joined through Order Explorer, which grants none of its other
 * benefits (Order Magic grants its spell), or through Druid Dedication (Order Spell grants it). Guarded as Foundry
 * guards an order's own benefits.
 */
export function order(slug: string, spell: string): Planned {
  const predicate = [{ not: `${ORDER_EXPLORER}:${slug}` }, { not: `${DRUID_DEDICATION}:${slug}` }];
  return [
    { ...DRUID_ENTRY, predicate },
    { entry: DRUID, spells: [spell], predicate },
  ];
}
