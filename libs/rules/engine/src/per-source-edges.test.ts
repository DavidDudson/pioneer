import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Selector, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { deriveStatistics } from './derive-statistics';
import { EngineMessage } from './messages';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { flatModifier, inPlay } from './testing';

/* Edges of statistics derived per source: variants, cycles, domains, collisions and bounds. */

function perSource(selector: string, per: string, base: string): StatisticDefinition {
  return StatisticDefinition.parse({
    slug: selector,
    name: selector,
    selector,
    domains: [],
    base,
    kind: StatisticKind.Check,
    per,
  });
}

/** The statistics a cycle within one spellcasting entry names. */
function cycleOf(entry: string): string {
  return `spell-attack:${entry}, spell-dc:${entry}`;
}

const STRIKE = perSource('strike', 'weapon', '@weapon.attr + @weapon.prof + @weapon.potency');
const SPELL_ATTACK = perSource('spell-attack', 'spellcasting', '@spellcasting.attr + @spellcasting.prof');
const LONGSWORD = { slug: 'longsword', category: 'martial', traits: [], potency: 1 };
const SHORTBOW = { slug: 'shortbow', category: 'martial', traits: [], range: 60 };
const ARCANE = { slug: 'arcane', tradition: 'arcane', attribute: 'int' };

/** Level 3: Strength 1, Dexterity 4, Intelligence 3; trained in martial weapons and arcane spells. */
const CHARACTER = {
  level: 3,
  attributes: { str: 1, dex: 4, con: 0, int: 3, wis: 0, cha: 0 },
  ranks: { 'attack:martial': 'trained', 'spellcasting:arcane': 'trained' },
};

function derive(
  definitions: readonly StatisticDefinition[],
  json: object,
  rules: readonly RuleInPlay[] = [],
): ReadonlyMap<Selector, StatisticResult> {
  const inputs = StatisticInputsJson.parse({ ...CHARACTER, ...json });
  return deriveStatistics({ definitions, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs, {
    rules,
    facts: new PredicateFacts([]),
  });
}

function totals(results: ReadonlyMap<Selector, StatisticResult>): Record<string, number | undefined> {
  return Object.fromEntries([...results].map(([selector, result]) => [selector, result.ok ? result.total : undefined]));
}

function inputIssues(json: object): readonly FieldIssue[] {
  const result = StatisticInputsJson.safeParse({ ...CHARACTER, ...json });
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** Proficiency Without Level's table, put in play as a variant would be. */
const WITHOUT_LEVEL = inPlay(
  { key: 'ProficiencyBonus', table: { untrained: '-2', trained: '2', expert: '4', master: '6', legendary: '8' } },
  'without-level',
);

describe('statistics derived per source, at the edges', () => {
  test('a variant proficiency table reaches weapon and spellcasting proficiency, and names itself on that term', () => {
    const results = derive([STRIKE, SPELL_ATTACK], { weapons: [LONGSWORD], spellcasting: [ARCANE] }, [WITHOUT_LEVEL]);
    // Trained is 2 without level: Strength 1 + 2 + potency 1, and Intelligence 3 + 2.
    expect(totals(results)).toStrictEqual({ 'spell-attack:arcane': 5, 'strike:longsword': 4 });
    expect(results.get(Selector.parse('strike:longsword'))).toMatchObject({
      base: [
        { formula: '@weapon.attr', origin: undefined },
        { formula: '@weapon.prof', origin: WITHOUT_LEVEL.origin },
        { formula: '@weapon.potency', origin: undefined },
      ],
    });
    expect(results.get(Selector.parse('spell-attack:arcane'))).toMatchObject({
      base: [{ origin: undefined }, { formula: '@spellcasting.prof', origin: WITHOUT_LEVEL.origin }],
    });
  });

  test('two families reading each other through @stat are a cycle within each source', () => {
    const attack = perSource('spell-attack', 'spellcasting', '@stat.spell-dc');
    const dc = perSource('spell-dc', 'spellcasting', '10 + @stat.spell-attack');
    const innate = { slug: 'innate', tradition: 'occult', attribute: 'cha' };
    const results = derive([attack, dc], { spellcasting: [ARCANE, innate] });
    expect(results.get(Selector.parse('spell-dc:arcane'))).toMatchObject({
      ok: false,
      error: { key: EngineMessage.StatisticCycle, params: { statistics: cycleOf('arcane') } },
    });
    expect(results.get(Selector.parse('spell-attack:innate'))).toMatchObject({
      ok: false,
      error: { key: EngineMessage.StatisticCycle, params: { statistics: cycleOf('innate') } },
    });
  });

  test("a family that already lists its source's attribute domain gets it once", () => {
    const listed = StatisticDefinition.parse({
      ...perSource('strike', 'weapon', '@weapon.attr + @weapon.prof'),
      domains: ['dex-based'],
    });
    const rules = [inPlay(flatModifier('untyped', 1, ['dex-based']), 'nimble')];
    expect(totals(derive([listed], { weapons: [SHORTBOW] }, rules))).toStrictEqual({ 'strike:shortbow': 4 + 5 + 1 });
  });

  test('without spellcasting entries a spellcasting family has no instances', () => {
    expect(totals(derive([SPELL_ATTACK], {}))).toStrictEqual({});
  });

  test('where an instance and a plain statistic share a selector, the one given later wins', () => {
    const plain = StatisticDefinition.parse({
      ...STRIKE,
      selector: 'strike:longsword',
      per: undefined,
      base: '@level',
    });
    const weapons = { weapons: [LONGSWORD] };
    expect(totals(derive([STRIKE, plain], weapons))).toStrictEqual({ 'strike:longsword': 3 });
    expect(totals(derive([plain, STRIKE], weapons))).toStrictEqual({ 'strike:longsword': 7 });
  });

  test('a source slug past the limit is an issue at the slug, so no instance is ever dropped', () => {
    const slug = 'a'.repeat(65);
    expect(inputIssues({ weapons: [{ ...LONGSWORD, slug }] })).toStrictEqual([
      { path: ['weapons', 0, 'slug'], message: message(EngineMessage.SourceSlugLength, { maximum: 64 }) },
    ]);
  });
});
