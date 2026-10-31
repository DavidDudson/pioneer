import { describe, expect, test } from 'bun:test';

import { battleFormInPlay } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import { entry, idOf, lookupOf } from '@pioneer/rules/grants/testing';
import { Level, RollOption, SpellRank } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { ActiveEffectSchema, EffectInstanceId, effectRoots } from './effects';
import { rulesOf } from './entry-rules';
import { EMPTY_INVENTORY } from './inventory';
import { itemFixtureContent } from './testing';

installRulesFakes();

const PLANT = entry('plant-form', [
  {
    key: 'BattleForm',
    predicate: ['plant-form:arboreal'],
    form: { tempHP: '10' },
    brackets: [{ start: 5, tempHP: '12' }],
  },
]);
const LOOKUP = lookupOf([PLANT]);

/** The temporary Hit Points of the plant form in force, for an effect cast at `rank` with `form` chosen. */
function formTempHp(rank: number, form: string | undefined): string | undefined {
  const effect = ActiveEffectSchema.parse({
    id: EffectInstanceId.parse('00000000-0000-4000-8000-000000000001'),
    effect: idOf('plant-form'),
    rank: SpellRank.parse(rank),
    ...(form === undefined ? {} : { form: RollOption.parse(form) }),
  });
  const resolution = resolveGrants({
    roots: effectRoots([effect]),
    lookup: LOOKUP,
    level: Level.parse(10),
    situation: effect.form === undefined ? [] : [effect.form],
    picks: new Map(),
    toggles: new Map(),
    rootSlots: [],
    namespaces: new Map(),
  });
  const rules = rulesOf(resolution, { inventory: EMPTY_INVENTORY, content: itemFixtureContent() }, () => true);
  const found = battleFormInPlay({ rules, facts: resolution.facts });
  return found?.form.tempHP === undefined ? undefined : String(found.form.tempHP);
}

describe('an effect carrying its rank and chosen form', () => {
  test('the chosen form picks the form that holds', () => {
    expect(formTempHp(4, 'plant-form:arboreal')).toBe('10');
    expect(formTempHp(4, undefined)).toBeUndefined();
  });

  test('the rank it was cast at heightens the form', () => {
    expect(formTempHp(5, 'plant-form:arboreal')).toBe('12');
  });
});

describe('an effect carrying the tradition it was cast with', () => {
  test('its root sets the hop that parent predicates read', () => {
    const effect = ActiveEffectSchema.parse({
      id: EffectInstanceId.parse('00000000-0000-4000-8000-000000000002'),
      effect: idOf('plant-form'),
      rank: SpellRank.parse(6),
      tradition: 'divine',
    });

    expect(effectRoots([effect]).map(({ hop }) => hop)).toEqual([
      { kind: 'effect', effect: idOf('plant-form'), rank: SpellRank.parse(6), tradition: 'divine' },
    ]);
  });
});
