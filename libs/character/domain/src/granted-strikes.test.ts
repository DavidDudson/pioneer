import { describe, expect, test } from 'bun:test';

import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';
import { entry, idOf, inputsOf, picked, picksOf, slotOf } from '@pioneer/rules/grants/testing';
import { BaseWeapon, Feet, RollOption, Trait, WeaponDamage } from '@pioneer/rules/sdk';

import { grantedStrikes } from './granted-strikes';

const FIST = { key: 'Strike', fist: true };
const JAWS = {
  key: 'Strike',
  slug: 'jaws',
  category: 'unarmed',
  damage: { dice: 1, die: 'd8', damageType: 'piercing' },
  traits: ['finesse'],
  display: { label: 'Jaws' },
};
const NO_FAVOURED: ReadonlySet<BaseWeapon> = new Set();
const FAVOURS_FIST: ReadonlySet<BaseWeapon> = new Set([BaseWeapon.parse('fist')]);

/** A level 1 character with each of `rules` on its own picked entry, named by the key. */
function resolved(rules: Readonly<Record<string, object>>): GrantResolution {
  const entries = Object.entries(rules).map(([slug, rule]) => entry(slug, [rule]));
  const roots = Object.keys(rules).map((slug) => picked(slug));
  return resolveGrants(inputsOf({ entries, roots, level: 1 }));
}

const slugs = (resolution: GrantResolution): string[] =>
  grantedStrikes(resolution, NO_FAVOURED).map(({ slug }) => String(slug));

describe('grantedStrikes', () => {
  test('gives one fist however many elements give one, from one of its givers', () => {
    const strikes = grantedStrikes(resolved({ 'deity-cleric': FIST, 'iron-fists': FIST }), NO_FAVOURED);
    const givers: readonly string[] = [idOf('deity-cleric'), idOf('iron-fists')];

    expect(strikes.map(({ slug }) => String(slug))).toEqual(['fist']);
    expect(givers).toContain(String(strikes[0]?.origin.entry));
  });

  test('is favoured when the deity favours the fist, and gives none while no element holds', () => {
    const gated = resolved({ 'deity-cleric': { ...FIST, predicate: ['deity:primary:favored-weapon:fist'] } });
    const always = resolved({ 'iron-fists': FIST });

    expect(grantedStrikes(gated, FAVOURS_FIST)).toEqual([]);
    expect(grantedStrikes(always, FAVOURS_FIST)[0]?.favored).toBe(true);
    expect(grantedStrikes(always, NO_FAVOURED)[0]?.favored).toBe(false);
  });

  test("a fist does 1d4 bludgeoning and is agile, as Foundry's", () => {
    const [fist] = grantedStrikes(resolved({ 'iron-fists': FIST }), NO_FAVOURED);

    expect(fist?.damage).toEqual(WeaponDamage.parse({ dice: 1, die: 'd4', damageType: 'bludgeoning' }));
    expect(fist?.traits).toContain(Trait.parse('agile'));
  });

  test('an element that defines an attack gives it, named by its label, beside the fist', () => {
    const strikes = grantedStrikes(resolved({ 'iron-fists': FIST, 'beast-form': JAWS }), NO_FAVOURED);

    expect(strikes.map(({ slug }) => String(slug))).toEqual(['fist', 'jaws']);
    expect(strikes[1]).toMatchObject({ category: 'unarmed', label: 'Jaws' });
  });

  test('an imported claw from a feat gives its attack with its brawling group, and one behind an unset option none', () => {
    const claws = { ...JAWS, slug: 'claw', group: 'brawling', display: { label: 'Claw' } };
    const ranged = { ...JAWS, slug: 'seed-spit', range: 30 };
    const gated = { ...claws, predicate: ['option:animal-feature:claw'] };

    const strikes = grantedStrikes(
      resolved({ 'hag-claws': claws, seedpod: ranged, 'animal-feature': gated }),
      NO_FAVOURED,
    );

    expect(strikes.map(({ slug }) => String(slug))).toEqual(['claw', 'seed-spit']);
    expect(strikes[1]?.range).toBe(Feet.parse(30));
  });

  test('a pick the level allows gates a Strike, and a pick it does not allow gives none', () => {
    const claws = { ...JAWS, slug: 'claw', predicate: ['animal-feature:claw'] };
    const wings = { ...JAWS, slug: 'wings-slam', predicate: ['animal-feature:wings'] };
    const feature = (level: number): GrantResolution => {
      const choice = {
        key: 'ChoiceSet',
        flag: 'animal-feature',
        rollOption: 'animal-feature',
        choices: [
          { value: 'claw', label: 'Claw' },
          { value: 'wings', label: 'Wings', predicate: [{ gte: ['item:level', 4] }] },
        ],
      };
      const effect = {
        ...entry('animal-feature', [choice, claws, wings]),
        rollOptions: [RollOption.parse(`level:${level}`)],
      };
      const picks = picksOf([[slotOf('animal-feature', 0), 'wings']]);
      return resolveGrants(inputsOf({ entries: [effect], roots: [picked('animal-feature')], level: 1, picks }));
    };

    expect(slugs(feature(4))).toEqual(['wings-slam']);
    expect(slugs(feature(3))).toEqual([]);
  });

  test('the first attack of a slug wins', () => {
    const strikes = grantedStrikes(
      resolved({ 'a-jaws': JAWS, 'b-jaws': { ...JAWS, damage: { dice: 2, die: 'd10', damageType: 'slashing' } } }),
      NO_FAVOURED,
    );

    expect(strikes.map(({ damage }) => damage?.die)).toEqual(['d8']);
  });
});
