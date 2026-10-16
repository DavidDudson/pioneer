import type { ContentId } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import type { Inventory, InventoryItemId } from './inventory';
import { CarryState } from './item-carry';
import { isSpecific, itemRunes, propertyRoom } from './item-runes';
import type { RunedContent } from './item-runes';
import { CORE_RULE_LIMITS } from './rule-limits';
import type { RuleLimits } from './rule-limits';
import { propertyFitRefusal, runedLine } from './rune-refusal';

/** A rule an inventory can break. */
export const RuleBreak = {
  Invested: 'invested',
  Hands: 'hands',
  PropertyRunes: 'propertyRunes',
  RuneNotAllowed: 'runeNotAllowed',
} as const;
export type RuleBreak = ValueOf<typeof RuleBreak>;

/** A count a rule limits. */
export const RuleCount = Pg.smallint().nonnegative().brand<'RuleCount'>();
export type RuleCount = z.infer<typeof RuleCount>;

/** An item over a count: `actual` is the count with this item in it, past the `limit`. */
export interface CountViolation {
  readonly item: InventoryItemId;
  readonly rule: typeof RuleBreak.Invested | typeof RuleBreak.Hands | typeof RuleBreak.PropertyRunes;
  readonly limit: RuleCount;
  readonly actual: RuleCount;
}

/** An item with a property rune that isn't allowed on it. */
export interface RuneViolation {
  readonly item: InventoryItemId;
  readonly rule: typeof RuleBreak.RuneNotAllowed;
  readonly rune: ContentId;
}

export type RuleViolation = CountViolation | RuneViolation;

/** A rule that limits a count, and how much each item adds to it. */
interface Counted {
  readonly step: (item: Inventory['items'][number]) => RuleCount;
  readonly limit: RuleCount;
  readonly rule: CountViolation['rule'];
}

/** The items past `limit` of a count that grows by `step` per item, each with the count it took the total to. */
function overLimit(inventory: Inventory, { step, limit, rule }: Counted): CountViolation[] {
  const violations: CountViolation[] = [];
  let total = 0;
  for (const item of inventory.items) {
    const added = step(item);
    total += added;
    if (added > 0 && total > limit) {
      violations.push({ item: item.id, rule, limit, actual: RuleCount.parse(total) });
    }
  }
  return violations;
}

function propertyViolations(content: RunedContent, inventory: Inventory, limits: RuleLimits): RuleViolation[] {
  return inventory.items.flatMap((item) => {
    const line = runedLine(content, inventory, item.id);
    // A specific item's property runes come with it and don't change, so no limit applies.
    if (line?.runed === undefined || isSpecific(line.entry)) {
      return [];
    }
    const runes = itemRunes(item, line.entry);
    const room = propertyRoom(runes, limits);
    const count: CountViolation[] =
      runes.property.length > room
        ? [
            {
              item: item.id,
              rule: RuleBreak.PropertyRunes,
              limit: RuleCount.parse(room),
              actual: RuleCount.parse(runes.property.length),
            },
          ]
        : [];
    // Each rune is read against the item's other runes, as it was when etched.
    const misfits: RuneViolation[] = runes.property
      .filter((rune) => {
        const others = runes.property.filter((each) => each !== rune);
        const without = { ...item, runes: { ...runes, property: others } };
        return propertyFitRefusal(content.runes, { ...line, item: without }, rune) !== undefined;
      })
      .map((rune) => ({ item: item.id, rule: RuleBreak.RuneNotAllowed, rune }));
    return [...count, ...misfits];
  });
}

/**
 * The rules `inventory` breaks, worked out on every read and never stored: one entry per item and rule it breaks. Items
 * past the invested limit and past the hands limit are those that take the count over it, in inventory order. A
 * property rune count is over the room its potency rune leaves; a rune not allowed is one the item's kind or
 * restriction refuses. A specific item's runes come with it and break nothing.
 */
export function inventoryViolations(
  inventory: Inventory,
  content: RunedContent,
  limits: RuleLimits = CORE_RULE_LIMITS,
): readonly RuleViolation[] {
  return [
    ...overLimit(inventory, {
      step: (each) => RuleCount.parse(each.invested === true ? 1 : 0),
      limit: RuleCount.parse(limits.investedMax),
      rule: RuleBreak.Invested,
    }),
    ...overLimit(inventory, {
      step: ({ carry }) => RuleCount.parse(carry.state === CarryState.Held ? carry.hands : 0),
      limit: RuleCount.parse(limits.handsMax),
      rule: RuleBreak.Hands,
    }),
    ...propertyViolations(content, inventory, limits),
  ];
}
