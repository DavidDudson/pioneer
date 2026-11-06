import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { deriveStatistics } from './derive-statistics';
import { RollEffectStatusKind } from './roll-effects';
import type { RollEffects } from './roll-effects';
import { ruleIdOf } from './rule-in-play';
import type { RuleId, RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { inPlay, statistic } from './testing';

const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

const DEFINITIONS = [
  statistic('skill:athletics', '10', ['skill-check']),
  statistic('save:will', '10', ['saving-throw']),
  statistic('perception', '10'),
];
const FACTS = new PredicateFacts([], CORE_NAMESPACES);
const NONE: RollEffects = { rollTwice: [], degreeAdjustments: [] };

const UNDEAD = ['target:trait:undead'];
const KNOWN_FALSE = ['self:effect:rage'];

function rollTwice(keep: string, selectors: readonly string[], predicate?: readonly string[]): unknown {
  return { key: 'RollTwice', selectors, keep, ...(predicate === undefined ? {} : { predicate }) };
}

function adjustDegree(selectors: readonly string[], extra: Readonly<Record<string, unknown>> = {}): unknown {
  return { key: 'AdjustDegreeOfSuccess', selectors, adjustment: { all: 'one-degree-better' }, ...extra };
}

/** The roll effects the statistic carries, or none when it carries none. */
function effectsOn(selector: string, rules: readonly RuleInPlay[], situation: readonly RuleId[] = []): RollEffects {
  const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const derived = deriveStatistics(content, inputs, { rules, facts: FACTS, situation: new Set(situation) });
  const result = derived.get(Selector.parse(selector));
  if (result?.ok !== true) {
    throw new Error(`Expected ${selector} to derive`);
  }
  return result.rollEffects ?? NONE;
}

function kept(effects: RollEffects): readonly string[] {
  return effects.rollTwice.map((line) => line.keep).toSorted();
}

function ids(effects: RollEffects): readonly RuleId[] {
  return effects.degreeAdjustments.map((line) => line.id);
}

describe('roll effects on a statistic', () => {
  test('a statistic nothing reaches carries none', () => {
    const luck = inPlay(rollTwice('higher', ['skill:athletics']), 'luck');
    expect(effectsOn('perception', [luck])).toEqual(NONE);
  });

  test('a RollTwice that holds is applied, with the die kept', () => {
    const luck = inPlay(rollTwice('higher', ['skill:athletics']), 'luck');
    const [line] = effectsOn('skill:athletics', [luck]).rollTwice;
    expect(line?.id).toBe(ruleIdOf(luck));
    expect(line?.keep).toBe('higher');
    expect(line?.status).toEqual({ kind: RollEffectStatusKind.Applied });
  });

  test('fortune and misfortune that both reach it are both reported', () => {
    const luck = inPlay(rollTwice('higher', ['skill-check']), 'luck');
    const curse = inPlay(rollTwice('lower', ['skill:athletics']), 'curse');
    expect(kept(effectsOn('skill:athletics', [luck, curse]))).toEqual(['higher', 'lower']);
  });

  test('one that depends on the situation is conditional until the roll chooses it', () => {
    const luck = inPlay(rollTwice('higher', ['perception'], UNDEAD), 'luck');
    const [open] = effectsOn('perception', [luck]).rollTwice;
    const [chosen] = effectsOn('perception', [luck], [ruleIdOf(luck)]).rollTwice;
    expect(open?.status.kind).toBe(RollEffectStatusKind.Conditional);
    expect(chosen?.status.kind).toBe(RollEffectStatusKind.Applied);
  });

  test('one whose predicate is known to fail is left out', () => {
    const luck = inPlay(rollTwice('higher', ['perception'], KNOWN_FALSE), 'luck');
    expect(effectsOn('perception', [luck])).toEqual(NONE);
  });

  test('a degree adjustment reaches the statistics it targets', () => {
    const boost = inPlay(adjustDegree(['skill-check']), 'boost');
    const [line] = effectsOn('skill:athletics', [boost]).degreeAdjustments;
    expect(line?.adjustment).toEqual({ all: 'one-degree-better' });
  });

  test('checkType limits an adjustment to skill checks or to saves', () => {
    const skills = inPlay(adjustDegree(['all'], { checkType: 'skill' }), 'skills');
    const saves = inPlay(adjustDegree(['all'], { checkType: 'save' }), 'saves');
    const rules = [skills, saves];
    expect(ids(effectsOn('skill:athletics', rules))).toEqual([ruleIdOf(skills)]);
    expect(ids(effectsOn('save:will', rules))).toEqual([ruleIdOf(saves)]);
    expect(effectsOn('perception', rules)).toEqual(NONE);
  });
});
