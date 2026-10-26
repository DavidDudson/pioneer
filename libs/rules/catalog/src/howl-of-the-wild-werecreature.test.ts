import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import { RuleElementKey } from '@pioneer/rules/sdk';

import { chosen, effectRulesOf, HOWL_OF_THE_WILD_EFFECTS, viewOf } from './testing/battle-forms';
import type { FormView } from './testing/battle-forms';

const SLUG = 'effect:effect-change-shape-werecreature';
const RANK = 1;

/** The druid as a werecreature of `kind` in `shape` (`animal` or `hybrid`), as the dedication and the form pick set them. */
function werecreature(kind: string, shape: string): FormView {
  return viewOf(
    effectRulesOf(SLUG, RANK, HOWL_OF_THE_WILD_EFFECTS),
    chosen(`werecreature:${kind}`, `change-shape:${shape}`),
  );
}

/** The slugs of the unarmed attacks the form gives the werecreature of `kind` in `shape`. */
function attacks(kind: string, shape: string): readonly string[] {
  const facts = chosen(`werecreature:${kind}`, `change-shape:${shape}`);
  return effectRulesOf(SLUG, RANK, HOWL_OF_THE_WILD_EFFECTS)
    .map(({ element }) => element)
    .flatMap((element) =>
      element.key === RuleElementKey.Strike &&
      (element.predicate === undefined || evaluatePredicate(element.predicate, facts) === Truth.True)
        ? [String(element.slug)]
        : [],
    );
}

describe('Howl of the Wild: Change Shape (Werecreature), level 10 druid', () => {
  test.each([
    ['werewolf', 30],
    ['werebear', 25],
    ['wererat', 25],
  ])('a %s in hybrid form has Speed %i', (kind, speed) => {
    expect(werecreature(kind, 'hybrid').total('speed:land')).toBe(speed);
  });

  test('a werebat flies at 15 feet', () => {
    expect(werecreature('werebat', 'hybrid').total('speed:fly')).toBe(15);
  });

  test('a form that keeps the statistics replaces none and adds its attacks to the druid’s own', () => {
    const form = werecreature('werewolf', 'hybrid');

    expect(form.total('ac')).toBe(25);
    expect(form.strikes.map(({ weapon }) => String(weapon.slug))).toEqual(['fist']);
    expect(attacks('werewolf', 'hybrid')).toEqual(['jaws']);
  });

  test('each kind has its own attacks', () => {
    expect(attacks('werebear', 'hybrid')).toEqual(['jaws', 'claw']);
    expect(attacks('wereboar', 'hybrid')).toContain('tusk');
    expect(attacks('weremoose', 'hybrid')).toContain('antler');
  });
});
