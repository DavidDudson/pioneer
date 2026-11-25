import { describe, expect, test } from 'bun:test';

import { CompanionKind } from '@pioneer/rules/sdk';

import { resolveGrants } from './resolve-grants';
import { entry, grantOf, inputsOf, picked } from './testing/builders';

const FAMILIAR_OPTION = 'self:companion:familiar';

/** The character's `self:companion:` options with `companions` live. */
function companionOptionsOf(companions: readonly CompanionKind[] | undefined): readonly string[] {
  const inputs = { ...inputsOf({ entries: [], roots: [] }), companions };

  return resolveGrants(inputs)
    .rollOptions.map(String)
    .filter((option: string) => option.startsWith('self:companion:'));
}

describe('the companion facts', () => {
  test('are the kind of each live companion', () => {
    expect(companionOptionsOf([CompanionKind.Familiar])).toEqual([FAMILIAR_OPTION]);
  });

  test('are none without a companion', () => {
    expect(companionOptionsOf([])).toEqual([]);
    expect(companionOptionsOf(undefined)).toEqual([]);
  });

  test('are what a grant predicate reads', () => {
    const feature = entry('familiar-feat', [{ ...grantOf('trained'), predicate: [FAMILIAR_OPTION] }]);
    const trained = entry('trained');

    const items = (companions: readonly CompanionKind[] | undefined): readonly string[] =>
      resolveGrants({
        ...inputsOf({ entries: [feature, trained], roots: [picked('familiar-feat')] }),
        companions,
      }).items.map(({ entry: each }) => each.slug);

    expect(items([CompanionKind.Familiar])).toContain('trained');
    expect(items([])).not.toContain('trained');
  });
});
