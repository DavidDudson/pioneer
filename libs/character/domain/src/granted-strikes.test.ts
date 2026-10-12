import { describe, expect, test } from 'bun:test';

import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';
import { entry, idOf, inputsOf, picked } from '@pioneer/rules/grants/testing';
import { BaseWeapon } from '@pioneer/rules/sdk';

import { grantedStrikes } from './granted-strikes';

const FIST = { key: 'Strike', fist: true };
const NO_FAVOURED: ReadonlySet<BaseWeapon> = new Set();
const FAVOURS_FIST: ReadonlySet<BaseWeapon> = new Set([BaseWeapon.parse('fist')]);

/** A level 1 character with each of `rules` on its own picked entry, named by the key. */
function resolved(rules: Readonly<Record<string, object>>): GrantResolution {
  const entries = Object.entries(rules).map(([slug, rule]) => entry(slug, [rule]));
  const roots = Object.keys(rules).map((slug) => picked(slug));
  return resolveGrants(inputsOf({ entries, roots, level: 1 }));
}

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
});
