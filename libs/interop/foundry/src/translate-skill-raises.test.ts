import { describe, expect, test } from 'bun:test';

import { RuleElement } from '@pioneer/rules/sdk';

import { withSkillRaise } from './translate-skill-raises';

/** Foundry's upgrade of `path` to `value`, with whatever `extra` fields it carries. */
function upgrade(path: string, value: unknown, extra: object = {}): object {
  return { key: 'ActiveEffectLike', mode: 'upgrade', path, value, ...extra };
}

describe('withSkillRaise', () => {
  test.each([
    ['trained', 1, 'trained'],
    ['expert', 2, 'expert'],
    ['master', 3, 'master'],
    ['legendary', 4, 'legendary'],
  ])('a fixed %s upgrade of a skill is a Proficiency element on it', (_name, value, rank) => {
    const translated = withSkillRaise(upgrade('system.skills.athletics.rank', value));

    expect(translated).toEqual({ key: 'Proficiency', selector: 'skill:athletics', rank });
    expect(RuleElement.safeParse(translated).success).toBe(true);
  });

  test('its predicate is kept', () => {
    const predicate = [{ not: 'feat:order-explorer:animal-order' }];

    expect(withSkillRaise(upgrade('system.skills.athletics.rank', 1, { predicate }))).toEqual({
      key: 'Proficiency',
      selector: 'skill:athletics',
      rank: 'trained',
      predicate,
    });
  });

  test.each([
    ['a formula value', upgrade('system.skills.nature.rank', 'ternary(gte(@actor.level,5),2,1)')],
    ['a Lore', upgrade('system.skills.dwarf-lore.rank', 1)],
    ['a skill Pioneer does not have', upgrade('system.skills.juggling.rank', 1)],
    ['an override', { ...upgrade('system.skills.nature.rank', 1), mode: 'override' }],
    ['a rank above legendary', upgrade('system.skills.nature.rank', 5)],
    ['an element with other fields', upgrade('system.skills.nature.rank', 1, { phase: 'beforeDerived' })],
    ['another path', upgrade('system.perception.rank', 1)],
  ])('%s is left as Foundry wrote it', (_name, raw) => {
    expect(withSkillRaise(raw)).toBe(raw);
  });
});

describe('withSkillRaise on a ChoiceSet pick', () => {
  const CHOSEN = 'system.skills.{item|flags.system.rulesSelections.skillExpert}.rank';

  test('a raise of the skill a ChoiceSet stored is a Proficiency element on the pick', () => {
    const translated = withSkillRaise(upgrade(CHOSEN, 2, { predicate: ['feature:x'] }));

    expect(translated).toEqual({
      key: 'Proficiency',
      selector: { choice: 'skill-expert', prefix: 'skill' },
      rank: 'expert',
      predicate: ['feature:x'],
    });
    expect(RuleElement.safeParse(translated).success).toBe(true);
  });

  test('a choice path outside the skills is left as Foundry wrote it', () => {
    const raw = upgrade('system.saves.{item|flags.system.rulesSelections.save}.rank', 1);

    expect(withSkillRaise(raw)).toBe(raw);
  });
});
