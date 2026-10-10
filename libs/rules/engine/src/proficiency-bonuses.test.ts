import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  ContentLicense,
  ContentPack,
  ContentRegistry,
  Origin,
  RollOption,
  RuleIndex,
  Selector,
} from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { BaseTermKind } from './base-term';
import { deriveStatistics } from './derive-statistics';
import type { RuleInPlay } from './rule-in-play';
import { statisticContent, variantRulesInPlay } from './statistic-content';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { inPlay, statistic } from './testing';

/** Level 3, trained in AC and nothing else. */
const inputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 0, dex: 2, con: 0, int: 0, wis: 1, cha: 0 },
  ranks: { ac: 'trained' },
});

const ac = statistic('ac', '10 + @attr.dex + @prof.ac');
const perception = statistic('perception', '@attr.wis + @prof.perception');
const content = { definitions: [ac, perception], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };

const WITHOUT_LEVEL = { untrained: '-2', trained: '2', expert: '4', master: '6', legendary: '8' };
const FLAT_TEN = { untrained: '10', trained: '10', expert: '10', master: '10', legendary: '10' };

function replacing(table: object, entry: string, fields: object = {}): RuleInPlay {
  return inPlay({ key: 'ProficiencyBonus', table, ...fields }, entry);
}

function derived(rules: readonly RuleInPlay[], ...options: readonly string[]): ReadonlyMap<Selector, StatisticResult> {
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
  return deriveStatistics(content, inputs, { rules, facts });
}

function total(results: ReadonlyMap<Selector, StatisticResult>, selector: string): number | undefined {
  const result = results.get(Selector.parse(selector));
  return result?.ok === true ? result.total : undefined;
}

/** The origin each term of a statistic's base carries, rounding lines left out. */
function termOrigins(
  results: ReadonlyMap<Selector, StatisticResult>,
  selector: string,
): readonly (Origin | undefined)[] {
  const result = results.get(Selector.parse(selector));
  const terms = result?.ok === true ? result.base : [];
  return terms.flatMap((term) => (term.kind === BaseTermKind.Term ? [term.origin] : []));
}

describe('proficiency bonuses', () => {
  test('the content table gives Player Core bonuses, and no term carries an origin', () => {
    const results = derived([]);
    // Trained: 2 + level 3; untrained: 0.
    expect(total(results, 'ac')).toBe(10 + 2 + 5);
    expect(total(results, 'perception')).toBe(1);
    expect(termOrigins(results, 'ac')).toStrictEqual([undefined, undefined, undefined]);
  });

  test('a ProficiencyBonus element replaces the table, and the @prof term names its origin', () => {
    const rule = replacing(WITHOUT_LEVEL, 'variant');
    const results = derived([rule]);
    expect(total(results, 'ac')).toBe(10 + 2 + 2);
    expect(total(results, 'perception')).toBe(1 - 2);
    expect(termOrigins(results, 'ac')).toStrictEqual([undefined, undefined, rule.origin]);
  });

  test('modifier formulas reading @prof read the replaced table too', () => {
    const element = { key: 'FlatModifier', type: 'untyped', value: '@prof.ac', selectors: ['perception'] };
    const bonus = inPlay(element, 'b');
    const variant = replacing(WITHOUT_LEVEL, 'variant');
    expect(total(derived([bonus]), 'perception')).toBe(1 + 5);
    expect(total(derived([bonus, variant]), 'perception')).toBe(1 - 2 + 2);
  });

  test('applies only while its predicate holds; unknown counts as not holding', () => {
    const gated = replacing(FLAT_TEN, 'gated', { predicate: ['self:effect:test'] });
    const situational = replacing(FLAT_TEN, 'situational', { predicate: ['terrain:forest'] });
    expect(total(derived([gated]), 'perception')).toBe(1);
    expect(total(derived([gated], 'self:effect:test'), 'perception')).toBe(1 + 10);
    expect(total(derived([situational]), 'perception')).toBe(1);
  });

  test('of several, the last by priority and then id wins, whatever their order', () => {
    const low = replacing(FLAT_TEN, 'a-low', { priority: 200 });
    const high = replacing(WITHOUT_LEVEL, 'b-high', { priority: 10 });
    expect(total(derived([low, high]), 'perception')).toBe(1 + 10);
    expect(total(derived([high, low]), 'perception')).toBe(1 + 10);
    const first = replacing(WITHOUT_LEVEL, 'a');
    const second = replacing(FLAT_TEN, 'b');
    expect(total(derived([second, first]), 'perception')).toBe(1 + 10);
  });
});

const variantPack = ContentPack.define({
  manifest: { id: 'variant-test', title: 'Variant test', publisher: 'Pioneer', license: ContentLicense.Homebrew },
  ancestries: [],
  creatures: [],
  proficiencyBonus: FLAT_TEN,
  variantRules: [
    {
      slug: 'flat',
      name: 'Flat',
      sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
      rules: [{ key: 'ProficiencyBonus', table: WITHOUT_LEVEL }],
    },
  ],
});

describe('statistic content from the registry', () => {
  test('is undefined until a pack defines the proficiency bonus table', () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withStatistic('ac').build());
    expect(statisticContent(registry)).toBeUndefined();
  });

  test('takes every statistic and the last registered table', () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withStatistic('ac').build());
    registry.register(variantPack);
    const fromRegistry = statisticContent(registry);
    expect(fromRegistry?.definitions).toStrictEqual(registry.statistics().map(({ definition }) => definition));
    expect(fromRegistry?.proficiencyBonus).toStrictEqual(variantPack.proficiencyBonus);
  });

  test('puts a variant rule in play with a variant hop and its sources', () => {
    const registry = new ContentRegistry();
    registry.register(variantPack);
    const variants = registry.variantRules();
    const [rule] = variantRulesInPlay(variants);
    const id = variants[0]?.id;
    expect(rule?.element).toStrictEqual(variants[0]?.definition.rules[0]);
    expect(rule?.rule).toBe(RuleIndex.parse(0));
    expect(rule?.origin).toStrictEqual(
      Origin.parse({
        hops: [{ kind: 'variant', rule: id }],
        entry: id,
        sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
      }),
    );
  });
});
