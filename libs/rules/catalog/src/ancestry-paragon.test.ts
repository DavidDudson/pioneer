import { describe, expect, test } from 'bun:test';

import { ContentRegistry, RuleElementKey, VariantStructure } from '@pioneer/rules/sdk';

import { coreRules } from './testing/core-rules';

const SLOT_LEVELS = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

const registry = new ContentRegistry();
registry.register(coreRules);

const variant = registry.variantRules().find(({ definition }) => definition.slug === 'variant-rule:ancestry-paragon');

/** The level each ancestry feat slot of the variant opens at, read from its `self:level` predicate. */
function slotLevels(): number[] {
  return (variant?.definition.rules ?? [])
    .filter(({ key }) => key === RuleElementKey.ChoiceSet)
    .map(({ predicate }) => JSON.stringify(predicate))
    .map((text) => Number(/(\d+)\]/.exec(text)?.[1]));
}

describe('the Ancestry Paragon variant in the core rules pack', () => {
  test('adds a slot of its own', () => {
    expect(variant?.definition.structure).toStrictEqual([VariantStructure.ExtraSlots]);
  });

  test('gives an ancestry feat at 1st level and every even level', () => {
    expect(slotLevels()).toStrictEqual(SLOT_LEVELS);
  });
});
