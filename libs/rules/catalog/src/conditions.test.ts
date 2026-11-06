import { describe, expect, test } from 'bun:test';

import { deriveStatistics, factsUnderForm } from '@pioneer/rules/engine';
import type { RuleInPlay } from '@pioneer/rules/engine';
import { inPlay } from '@pioneer/rules/engine/testing';
import { ContentEntryFile, ContentKind } from '@pioneer/rules/sdk';

import { core, fighter, noFacts, totals } from './testing/core-rules';

const VALUES = [1, 2, 3, 4] as const;
const ALL_CHECKS_AND_DCS = [
  'ac',
  'save:fortitude',
  'save:reflex',
  'save:will',
  'perception',
  'class-dc',
  'skill:acrobatics',
  'skill:athletics',
  'skill:arcana',
  'skill:stealth',
  'skill:diplomacy',
  'skill:survival',
];

const file = await import('@pioneer/content/packs/player-core/condition.json');
const conditions = ContentEntryFile.parse(file.default).filter((each) => each.kind === ContentKind.Condition);

/** The rule elements of the Player Core condition `slug`, in play at `value`. */
function conditionRules(slug: string, value: number): readonly RuleInPlay[] {
  const entry = conditions.find((each) => each.slug === `condition:${slug}`);
  if (entry === undefined) {
    throw new Error(`no Player Core condition ${slug}`);
  }
  return entry.rules.map((element, rule) => inPlay(element, slug, { rule, conditionValue: value }));
}

/** The fighter's totals with `rules` in play. */
function fighterWith(rules: readonly RuleInPlay[]): Record<string, number | undefined> {
  const facts = factsUnderForm({ rules, facts: noFacts() });
  return totals(deriveStatistics(core, fighter, { rules, facts }));
}

const BASE = fighterWith([]);

/** How much lower `held` has `selector` than the fighter's own total. */
const drop = (held: Record<string, number | undefined>, selector: string): number =>
  (BASE[selector] ?? 0) - (held[selector] ?? 0);

/** How much `slug` at `value` lowers each of `selectors` from the fighter's own total. */
function lowered(slug: string, value: number, selectors: readonly string[]): Record<string, number> {
  const held = fighterWith(conditionRules(slug, value));
  return Object.fromEntries(selectors.map((selector) => [selector, drop(held, selector)]));
}

const sameFor = (selectors: readonly string[], amount: number): Record<string, number> =>
  Object.fromEntries(selectors.map((selector) => [selector, amount]));

describe('valued penalty conditions in Player Core', () => {
  test.each(VALUES)('frightened %i lowers every check and DC by %i', (value) => {
    expect(lowered('frightened', value, ALL_CHECKS_AND_DCS)).toEqual(sameFor(ALL_CHECKS_AND_DCS, value));
  });

  test.each(VALUES)('sickened %i lowers every check and DC by %i', (value) => {
    expect(lowered('sickened', value, ALL_CHECKS_AND_DCS)).toEqual(sameFor(ALL_CHECKS_AND_DCS, value));
  });

  test.each(['frightened', 'sickened'])('%s leaves Hit Points, Speeds, reach and the dying limit alone', (slug) => {
    const values = ['hp:max', 'speed:land', 'reach', 'dying-max'];
    expect(lowered(slug, 3, values)).toEqual(sameFor(values, 0));
  });

  test('penalties of one type from different conditions do not stack, only the worst applies', () => {
    const held = fighterWith([
      ...conditionRules('frightened', 1),
      ...conditionRules('sickened', 3),
      ...conditionRules('clumsy', 2),
    ]);
    expect(drop(held, 'ac')).toBe(3);
    expect(drop(held, 'save:reflex')).toBe(3);
    expect(drop(held, 'save:will')).toBe(3);
  });

  test.each(VALUES)('clumsy %i lowers only Dexterity-based statistics by %i', (value) => {
    const dexterity = ['ac', 'save:reflex', 'skill:acrobatics', 'skill:stealth'];
    const others = ['save:fortitude', 'save:will', 'perception', 'skill:athletics', 'skill:arcana'];
    expect(lowered('clumsy', value, dexterity)).toEqual(sameFor(dexterity, value));
    expect(lowered('clumsy', value, others)).toEqual(sameFor(others, 0));
  });

  test.each(VALUES)('stupefied %i lowers only Intelligence, Wisdom and Charisma statistics by %i', (value) => {
    const mental = ['save:will', 'perception', 'skill:arcana', 'skill:diplomacy', 'skill:survival'];
    const others = ['ac', 'save:fortitude', 'save:reflex', 'skill:athletics', 'skill:acrobatics'];
    expect(lowered('stupefied', value, mental)).toEqual(sameFor(mental, value));
    expect(lowered('stupefied', value, others)).toEqual(sameFor(others, 0));
  });

  test.each(VALUES)('enfeebled %i lowers only Strength-based statistics by %i', (value) => {
    const strength = ['skill:athletics'];
    const others = ['ac', 'save:fortitude', 'save:reflex', 'save:will', 'perception', 'skill:acrobatics'];
    expect(lowered('enfeebled', value, strength)).toEqual(sameFor(strength, value));
    expect(lowered('enfeebled', value, others)).toEqual(sameFor(others, 0));
  });

  test.each(VALUES)('drained %i lowers Fortitude by %i and maximum Hit Points by level times %i', (value) => {
    const { level } = fighter;
    expect(lowered('drained', value, ['save:fortitude', 'hp:max'])).toEqual({
      'save:fortitude': value,
      'hp:max': Math.max(level, 1) * value,
    });
    const others = ['ac', 'save:reflex', 'save:will', 'perception'];
    expect(lowered('drained', value, others)).toEqual(sameFor(others, 0));
  });
});
