import { describe, expect, test } from 'bun:test';

import { fromFoundryBadgeFormula, fromFoundryFormula } from './foundry-formula';

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

  test.each([
    ['(1 + floor(@item.origin.level / 4))d4', '(1 + floor(@item.origin.level / 4))d4'],
    ['(@actor.flags.system.consumeFear)d8', '(@flag.consumeFear)d8'],
    ['(@actor.level)d6 + @actor.system.abilities.str.mod', '(@level)d6 + @attr.str'],
    ['@actor.flags.pf2e.unknown', '@actor.flags.pf2e.unknown'],
    ['1d4', '1d4'],
  ])('a badge formula %p reads %p', (foundry, pioneer) => {
    expect(fromFoundryBadgeFormula(foundry)).toBe(pioneer);
  });

  test('a flag is not a reference outside a badge', () => {
    expect(fromFoundryFormula('@actor.flags.system.consumeFear')).toBe('@actor.flags.system.consumeFear');
  });
});
