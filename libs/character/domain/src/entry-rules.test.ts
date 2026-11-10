import { describe, expect, test } from 'bun:test';

import { RuleInPlay } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';
import { entry, inputsOf, picked } from '@pioneer/rules/grants/testing';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { rulesOf } from './entry-rules';
import { EMPTY_INVENTORY } from './inventory';
import { itemFixtureContent } from './testing';

installRulesFakes();

const GEAR = entry('gear', [
  { key: 'FlatModifier', selectors: ['ac'], type: 'untyped', value: 1 },
  { key: 'FlatModifier', selectors: ['perception'], type: 'untyped', value: 2 },
]);

function resolution(): GrantResolution {
  return resolveGrants(inputsOf({ entries: [GEAR], roots: [picked('gear')] }));
}

describe('rulesOf', () => {
  test('places each element of an entry, in order, as the schema would read it', () => {
    const rules = rulesOf(resolution(), { inventory: EMPTY_INVENTORY, content: itemFixtureContent() }, () => true);

    expect(rules.map(({ rule }) => Number(rule))).toStrictEqual([0, 1]);
    for (const placed of rules) {
      expect(RuleInPlay.parse(placed)).toStrictEqual(placed);
    }
  });

  test('shares an entry’s parsed elements between reads', () => {
    const context = { inventory: EMPTY_INVENTORY, content: itemFixtureContent() };
    const [first] = rulesOf(resolution(), context, () => true);
    const [second] = rulesOf(resolution(), context, () => true);

    expect(second?.element).toBe(first?.element);
  });
});
