import { describe, expect, test } from 'bun:test';

import { rulesIn } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL } from './testing/kind-fixtures';

/** A Player Core heritage with `rules`, shaped as `pf2e-8.6.0` has it. */
function heritage(rules: readonly object[]): DocumentFixture {
  return {
    id: 'hErItAgE00000000',
    name: 'Cavern Elf',
    type: 'heritage',
    system: { ancestry: FOUNDRY_NULL, rules, traits: { rarity: 'common', value: [] } },
  };
}

interface Form {
  readonly brackets: readonly unknown[];
}

const DRAGON_FORM = {
  key: 'BattleForm',
  brackets: [{ start: 6, value: { size: 'lg' } }],
  overrides: { speeds: { fly: 100, land: 40 } },
};

const FLY_BONUS = {
  key: 'FlatModifier',
  selector: 'fly-speed',
  type: 'status',
  value: 'match(when(gte(@item.level, 8), 20))',
};

function formRules(rules: readonly object[]): Form[] {
  return rulesIn(translate([heritage(rules)]), 'cavern-elf') as Form[];
}

describe('translateRules: a speed FlatModifier from an item level', () => {
  test('becomes a bracket of the form at its rank, the form speed plus the bonus', () => {
    const [form, ...others] = formRules([DRAGON_FORM, FLY_BONUS]);

    expect(others).toEqual([]);
    expect(form?.brackets).toEqual([
      { start: 6, size: 'large' },
      { start: 8, speeds: { fly: 120 } },
    ]);
  });

  test('joins the bracket the form already has at that rank', () => {
    const held = { ...DRAGON_FORM, brackets: [{ start: 8, value: { size: 'huge' } }] };
    const [form] = formRules([held, FLY_BONUS]);

    expect(form?.brackets).toEqual([{ start: 8, size: 'huge', speeds: { fly: 120 } }]);
  });

  test('stays out of the form when it has no number for that speed', () => {
    const [form] = formRules([DRAGON_FORM, { ...FLY_BONUS, selector: 'swim-speed' }]);

    expect(form?.brackets).toEqual([{ start: 6, size: 'large' }]);
  });
});

describe('translateRules: a speed FlatModifier by tiers', () => {
  const AERIAL_BONUS = {
    key: 'FlatModifier',
    selector: 'fly-speed',
    type: 'status',
    value: 'match(when(btwn(@item.level, 5, 5), 10), when(gte(@item.level, 6), 15))',
  };
  const BAT = { key: 'BattleForm', overrides: { speeds: { fly: 30, land: 20 } } };
  const BIRD = { key: 'BattleForm', overrides: { speeds: { fly: 50, land: 10 } } };

  test('gives each form a bracket for every rank at which the bonus changes', () => {
    const [bat, bird, ...others] = formRules([BAT, BIRD, AERIAL_BONUS]);

    expect(others).toEqual([]);
    expect(bat?.brackets).toEqual([
      { start: 5, speeds: { fly: 40 } },
      { start: 6, speeds: { fly: 45 } },
    ]);
    expect(bird?.brackets).toEqual([
      { start: 5, speeds: { fly: 60 } },
      { start: 6, speeds: { fly: 65 } },
    ]);
  });

  test('stays when it is any other formula', () => {
    const other = { ...AERIAL_BONUS, value: 'match(when(gte(@actor.level, 6), 15))' };
    const [bat] = formRules([BAT, other]);

    expect(bat?.brackets).toBeUndefined();
  });
});
