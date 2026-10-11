import { describe, expect, test } from 'bun:test';

import { fromFoundryFormula } from './foundry-formula';

describe('fromFoundryFormula', () => {
  test.each([
    ['@actor.level', '@level'],
    ['@actor.system.abilities.str.mod', '@attr.str'],
    ['max(1, floor(@actor.level/2))', 'max(1, floor(@level / 2))'],
    ['-@item.system.level.value', '-@item.level'],
    ['-@item.badge.value', '-@item.value'],
    ['max(1,@actor.level) * @item.badge.value', 'max(1, @level) * @item.value'],
    ['ternary(gte(@actor.level, 5), 2, 1)', 'ternary(gte(@level, 5), 2, 1)'],
  ])('translates %p to %p', (foundry, pioneer) => {
    expect(fromFoundryFormula(foundry)).toBe(pioneer);
  });

  test.each(['@actor.flags.pf2e.unknown', '{item|system.level.value}', '2'])('keeps %p as written', (text) => {
    expect(fromFoundryFormula(text)).toBe(text);
  });
});
