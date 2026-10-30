import { describe, expect, test } from 'bun:test';

import { dataIn, gapKeys } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import { effectWithBadge } from './testing/magic-fixtures';

describe('translateKindData: effect badges', () => {
  test.each([
    ['(1 + floor(@item.origin.level / 4))d4', '(1 + floor(@item.origin.level / 4))d4'],
    ['(@actor.flags.system.consumeFear)d8', '(@flag.consumeFear)d8'],
    ['2d20kh1', '2d20kh1'],
    ['2d20kl1', '2d20kl1'],
    [
      '(ternary(gte(@actor.flags.system.corrosiveBody.rank,9),5,3))d6',
      '(ternary(gte(@flag.corrosiveBody.rank,9),5,3))d6',
    ],
  ])('a rolled badge of %s keeps its dice count and reads Pioneer references', (foundry, formula) => {
    const rolled = translate([effectWithBadge(foundry)]);

    expect(dataIn(rolled, 'effect-rage')).toMatchObject({ badge: { type: 'formula', formula } });
    expect(gapKeys(rolled)).toEqual([]);
  });

  test('a badge that reads a reference with no translation is reported', () => {
    const rolled = translate([effectWithBadge('(@actor.flags.pf2e.unknown)d6')]);

    expect(dataIn(rolled, 'effect-rage')).toBeUndefined();
    expect(gapKeys(rolled)).toEqual(['invalid-data badge.formula']);
  });
});
