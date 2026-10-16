import { describe, expect, test } from 'bun:test';

import { assert, integer, property } from 'fast-check';

import { InvestedCount, Hands } from './item-carry';
import { CORE_RULE_LIMITS, RuleLimitsSchema } from './rule-limits';
import { inventoryViolations, RuleBreak } from './rule-violations';
import { inventory, itemFixtureContent, runeFixtureContent } from './testing';

const content = { items: itemFixtureContent(), runes: runeFixtureContent() };

const SPARE = 5;
const investedMax = integer({ min: 1, max: 12 }).map((each) => InvestedCount.parse(each));
const handsMax = integer({ min: 1, max: 4 }).map((each) => Hands.parse(each));

describe('inventoryViolations (properties)', () => {
  test('an inventory the schema accepts breaks no count under the core limits', () => {
    assert(
      property(inventory, (stock) => {
        expect(inventoryViolations(stock, content)).toStrictEqual([]);
      }),
    );
  });

  test('every count violation is past its limit, and names an item in the inventory', () => {
    assert(
      property(inventory, investedMax, handsMax, (stock, invested, hands) => {
        const limits = RuleLimitsSchema.parse({ ...CORE_RULE_LIMITS, investedMax: invested, handsMax: hands });
        const ids = new Set(stock.items.map((each) => each.id));
        const found = inventoryViolations(stock, content, limits);
        expect(found.every((each) => ids.has(each.item))).toBe(true);
        expect(found.filter((each) => 'limit' in each).every((each) => each.actual > each.limit)).toBe(true);
      }),
    );
  });

  test('items invested past the limit number the invested items less the limit', () => {
    assert(
      property(inventory, investedMax, (stock, max) => {
        const limits = RuleLimitsSchema.parse({ ...CORE_RULE_LIMITS, investedMax: max });
        const invested = stock.items.filter((each) => each.invested === true).length;
        const over = inventoryViolations(stock, content, limits).filter((each) => each.rule === RuleBreak.Invested);
        expect(over).toHaveLength(Math.max(0, invested - max));
      }),
    );
  });

  test('raising a limit never adds a violation', () => {
    assert(
      property(inventory, investedMax, handsMax, (stock, invested, hands) => {
        const tight = RuleLimitsSchema.parse({ ...CORE_RULE_LIMITS, investedMax: invested, handsMax: hands });
        const loose = RuleLimitsSchema.parse({
          ...tight,
          investedMax: invested + SPARE,
          handsMax: hands + SPARE,
        });
        const keys = (limits: typeof tight): Set<string> =>
          new Set(inventoryViolations(stock, content, limits).map((each) => `${each.rule}:${each.item}`));
        const before = keys(tight);
        for (const key of keys(loose)) {
          expect(before.has(key)).toBe(true);
        }
      }),
    );
  });
});
