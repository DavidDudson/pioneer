import { describe, expect, test } from 'bun:test';

import { battleFormInPlay } from '@pioneer/rules/engine';
import type { ModifierInputs } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import { entry, feat, idOf, lookupOf } from '@pioneer/rules/grants/testing';
import { Level, RuleElementKey } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { exclusiveEffects } from './effect-exclusivity';
import { ActiveEffectSchema, effectRoots, EffectInstanceId } from './effects';
import type { ActiveEffect } from './effects';
import { rulesOf } from './entry-rules';
import { EMPTY_INVENTORY } from './inventory';
import { itemFixtureContent } from './testing';

installRulesFakes();

/** A polymorph that is no battle form: it changes size and roll options and adds a modifier, and replaces no statistic. */
const GIANT_DISGUISE = {
  ...feat('giant-disguise', ['trait:polymorph']),
  rules: entry('giant-disguise', [
    { key: 'CreatureSize', value: 1 },
    { key: 'RollOption', option: 'disguised-as:giant', domain: 'all' },
    { key: 'FlatModifier', selectors: ['skill:intimidation'], value: 1, type: 'circumstance' },
  ]).rules,
};

const PLANT = {
  ...feat('plant-form', ['trait:polymorph']),
  rules: entry('plant-form', [{ key: 'BattleForm', form: { tempHP: '10' } }]).rules,
};

const LOOKUP = lookupOf([GIANT_DISGUISE, PLANT]);

function applied(slug: string, index: number): ActiveEffect {
  const suffix = index.toString(16).padStart(12, '0');
  return ActiveEffectSchema.parse({
    id: EffectInstanceId.parse(`00000000-0000-4000-8000-${suffix}`),
    effect: idOf(slug),
  });
}

/** The rules in force for `effects` once polymorph exclusivity has picked the ones that count. */
function inForce(effects: readonly ActiveEffect[]): ModifierInputs {
  const { active } = exclusiveEffects(effects, LOOKUP);
  const resolution = resolveGrants({
    roots: effectRoots(active),
    lookup: LOOKUP,
    level: Level.parse(10),
    situation: [],
    picks: new Map(),
    toggles: new Map(),
    rootSlots: [],
    namespaces: new Map(),
  });
  const rules = rulesOf(resolution, { inventory: EMPTY_INVENTORY, content: itemFixtureContent() }, () => true);
  return { rules, facts: resolution.facts };
}

describe('a polymorph effect that is not a battle form', () => {
  test('keeps its ordinary rule elements and sets no battle form', () => {
    const form = inForce([applied('giant-disguise', 1)]);
    const keys = form.rules.map(({ element }) => element.key);

    expect(keys).toContain(RuleElementKey.CreatureSize);
    expect(keys).toContain(RuleElementKey.RollOption);
    expect(keys).toContain(RuleElementKey.FlatModifier);
    expect(battleFormInPlay(form)).toBeUndefined();
  });

  test('replaces a battle form, which then no longer applies', () => {
    const plant = applied('plant-form', 1);
    const disguise = applied('giant-disguise', 2);

    expect(exclusiveEffects([plant, disguise], LOOKUP)).toStrictEqual({ active: [disguise], replaced: [plant] });
    expect(battleFormInPlay(inForce([plant, disguise]))).toBeUndefined();
  });

  test('is replaced by a battle form applied after it, which then applies', () => {
    const disguise = applied('giant-disguise', 1);
    const plant = applied('plant-form', 2);

    expect(exclusiveEffects([disguise, plant], LOOKUP)).toStrictEqual({ active: [plant], replaced: [disguise] });
    expect(battleFormInPlay(inForce([disguise, plant]))).toBeDefined();
  });
});
