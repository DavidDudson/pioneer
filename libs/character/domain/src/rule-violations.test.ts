import { describe, expect, test } from 'bun:test';

import { FundamentalRune } from '@pioneer/rules/sdk';

import type { Inventory, InventoryItemId } from './inventory';
import { CarryState, Hands, InvestedCount } from './item-carry';
import { CORE_RULE_LIMITS, RuleLimitsSchema } from './rule-limits';
import type { RuleLimits } from './rule-limits';
import { inventoryViolations, RuleBreak, RuleCount } from './rule-violations';
import { etchRune } from './rune-edits';
import {
  Armoury,
  armoury,
  fundamental,
  itemFixtureContent,
  propertyRune,
  RuneFixture,
  runeFixtureContent,
  runeFixtureId,
} from './testing';

const content = { items: itemFixtureContent(), runes: runeFixtureContent() };

const POTENCY_1 = fundamental(FundamentalRune.Potency, 1);
const FLAMING = propertyRune(RuneFixture.Flaming);
const FROST = propertyRune(RuneFixture.Frost);
const HOLY = propertyRune(RuneFixture.Holy);
const UNHOLY = propertyRune(RuneFixture.Unholy);

function withLimits(limits: Partial<RuleLimits>): RuleLimits {
  return RuleLimitsSchema.parse({ ...CORE_RULE_LIMITS, ...limits });
}

/** `inventory` with `change` applied to each item `ids` names, skipping the schema's own limits. */
function changed(
  inventory: Inventory,
  ids: readonly InventoryItemId[],
  change: Partial<Inventory['items'][number]>,
): Inventory {
  return {
    ...inventory,
    items: inventory.items.map((each) => (ids.includes(each.id) ? { ...each, ...change } : each)),
  };
}

describe('CORE_RULE_LIMITS', () => {
  test('are the core rules: ten invested, two hands, a property rune per grade, 500 lines', () => {
    expect(CORE_RULE_LIMITS).toStrictEqual(
      RuleLimitsSchema.parse({
        investedMax: 10,
        handsMax: 2,
        propertyRunesPerGrade: 1,
        itemsMax: 500,
      }),
    );
  });
});

describe('inventoryViolations', () => {
  test('finds nothing in an inventory within the limits', () => {
    const potent = etchRune(armoury(), Armoury.Sword, POTENCY_1);
    const stock = etchRune(potent, Armoury.Sword, FLAMING);
    expect(inventoryViolations(stock, content)).toStrictEqual([]);
  });

  test('names each item that takes invested items past the limit, with the count it reached', () => {
    const stock = changed(armoury(), [Armoury.Armor, Armoury.Shield, Armoury.Bow], { invested: true });
    const tight = withLimits({ investedMax: InvestedCount.parse(1) });
    expect(inventoryViolations(stock, content, tight)).toStrictEqual([
      { item: Armoury.Shield, rule: RuleBreak.Invested, limit: RuleCount.parse(1), actual: RuleCount.parse(2) },
      { item: Armoury.Bow, rule: RuleBreak.Invested, limit: RuleCount.parse(1), actual: RuleCount.parse(3) },
    ]);
    expect(inventoryViolations(stock, content)).toStrictEqual([]);
  });

  test('names each item that takes the hands in use past the limit', () => {
    const held = { state: CarryState.Held, hands: Hands.parse(1) } as const;
    const stock = changed(armoury(), [Armoury.Sword, Armoury.SpareSword, Armoury.Bow], { carry: held });
    expect(inventoryViolations(stock, content)).toStrictEqual([
      { item: Armoury.SpareSword, rule: RuleBreak.Hands, limit: RuleCount.parse(2), actual: RuleCount.parse(3) },
    ]);
    const roomy = withLimits({ handsMax: Hands.parse(3) });
    expect(inventoryViolations(stock, content, roomy)).toStrictEqual([]);
  });

  test('names an item with more property runes than its potency rune leaves room for', () => {
    let stock = etchRune(armoury(), Armoury.Sword, POTENCY_1);
    stock = etchRune(stock, Armoury.Sword, FLAMING);
    stock = etchRune(stock, Armoury.Sword, FROST);
    expect(inventoryViolations(stock, content)).toStrictEqual([
      { item: Armoury.Sword, rule: RuleBreak.PropertyRunes, limit: RuleCount.parse(1), actual: RuleCount.parse(2) },
    ]);
  });

  test('reads the room from the limits: two a grade leaves room for both', () => {
    let stock = etchRune(armoury(), Armoury.Sword, POTENCY_1);
    stock = etchRune(stock, Armoury.Sword, FLAMING);
    stock = etchRune(stock, Armoury.Sword, FROST);
    const roomy = withLimits({ propertyRunesPerGrade: 2 as RuleLimits['propertyRunesPerGrade'] });
    expect(inventoryViolations(stock, content, roomy)).toStrictEqual([]);
  });

  test('names each property rune the item refuses', () => {
    let stock = etchRune(armoury(), Armoury.Sword, fundamental(FundamentalRune.Potency, 2));
    stock = etchRune(stock, Armoury.Sword, HOLY);
    stock = etchRune(stock, Armoury.Sword, UNHOLY);
    expect(inventoryViolations(stock, content)).toStrictEqual([
      { item: Armoury.Sword, rule: RuleBreak.RuneNotAllowed, rune: runeFixtureId(RuneFixture.Holy) },
      { item: Armoury.Sword, rule: RuleBreak.RuneNotAllowed, rune: runeFixtureId(RuneFixture.Unholy) },
    ]);
  });

  test('breaks nothing for a specific item, whose runes come with it', () => {
    expect(inventoryViolations(armoury(), content)).toStrictEqual([]);
  });
});
