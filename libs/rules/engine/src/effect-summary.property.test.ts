import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentId, contentId, ContentKind, entrySlug, PackId, Selector, Slug } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { array, assert, constantFrom, integer, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { deriveStatistics } from './derive-statistics';
import { EffectChange, EffectMode, EffectStatusKind } from './effect-line';
import type { EffectLine } from './effect-line';
import { summariseEffects } from './effect-summary';
import type { EffectScope, SummarisedEntry } from './effect-summary';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { flatModifier, inPlay, statistic } from './testing';

const TYPES = ['untyped', 'status', 'circumstance', 'item'] as const;
const VALUE_MAX = 6;
const ELEMENTS_MAX = 6;
const BASE = 10;
const PERCEPTION = Selector.parse('perception');
const definitions = [statistic('perception', String(BASE))];
const content = { definitions, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const facts = new PredicateFacts([], CORE_NAMESPACES);

interface Placed {
  readonly type: (typeof TYPES)[number];
  readonly value: number;
}

const modifiers: Arbitrary<readonly Placed[]> = array(
  record({
    type: constantFrom(...TYPES),
    value: integer({ min: -VALUE_MAX, max: VALUE_MAX }),
  }),
  { maxLength: ELEMENTS_MAX },
);

function rulesOf(entry: string, elements: readonly Placed[]): RuleInPlay[] {
  return elements.map(({ type, value }, rule) => inPlay(flatModifier(type, value, ['perception']), entry, { rule }));
}

function entryOf(name: string, elements: readonly Placed[]): SummarisedEntry {
  const slug = entrySlug(ContentKind.Effect, Slug.parse(name));
  const rules = rulesOf(name, elements);
  return {
    id: ContentId.parse(contentId(PackId.parse('engine-test'), slug)),
    rules: rules.map(({ element }) => element),
    sources: inPlay(flatModifier('untyped', 0, ['perception']), name).origin.sources,
  };
}

function scopeOf(rules: readonly RuleInPlay[]): EffectScope {
  return { content, inputs, modifiers: { rules, facts } };
}

/** The sum of the values of the lines that count. */
function applied(lines: readonly EffectLine[]): number {
  let sum = 0;
  for (const line of lines) {
    if (
      (line.change === EffectChange.Bonus || line.change === EffectChange.Penalty) &&
      line.status.kind === EffectStatusKind.Applied
    ) {
      sum += line.value ?? 0;
    }
  }
  return sum;
}

function computed(rules: readonly RuleInPlay[]): number {
  const result = deriveStatistics(content, inputs, { rules, facts }).get(PERCEPTION);
  return result?.ok === true ? result.computed : Number.NaN;
}

describe('summariseEffects properties', () => {
  test('the applying lines of the only entry in play add up to the breakdown', () => {
    assert(
      property(modifiers, (placed) => {
        const rules = rulesOf('gear', placed);
        const lines = summariseEffects(scopeOf(rules), entryOf('gear', placed), EffectMode.Applying);
        expect(BASE + applied(lines)).toBe(computed(rules));
      }),
    );
  });

  test('the applying lines of two entries in play add up to the breakdown', () => {
    assert(
      property(modifiers, modifiers, (mine, rest) => {
        const rules = [...rulesOf('gear', mine), ...rulesOf('other', rest)];
        const gear = summariseEffects(scopeOf(rules), entryOf('gear', mine), EffectMode.Applying);
        const other = summariseEffects(scopeOf(rules), entryOf('other', rest), EffectMode.Applying);
        expect(BASE + applied(gear) + applied(other)).toBe(computed(rules));
      }),
    );
  });

  test('would-apply for an entry already in play equals applying', () => {
    assert(
      property(modifiers, modifiers, (mine, rest) => {
        const scope = scopeOf([...rulesOf('gear', mine), ...rulesOf('other', rest)]);
        const entry = entryOf('gear', mine);
        expect(summariseEffects(scope, entry, EffectMode.WouldApply)).toStrictEqual(
          summariseEffects(scope, entry, EffectMode.Applying),
        );
      }),
    );
  });

  test('would-apply for an entry not in play equals applying once it is', () => {
    assert(
      property(modifiers, modifiers, (mine, rest) => {
        const entry = entryOf('gear', mine);
        const before = summariseEffects(scopeOf(rulesOf('other', rest)), entry, EffectMode.WouldApply);
        const after = summariseEffects(
          scopeOf([...rulesOf('other', rest), ...rulesOf('gear', mine)]),
          entry,
          EffectMode.Applying,
        );
        expect(before).toStrictEqual(after);
      }),
    );
  });
});
