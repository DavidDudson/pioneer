import { describe, expect, test } from 'bun:test';

import { SUDDEN_CHARGE } from './testing/build-fixtures';
import { dataIn, gapKeys } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';

describe('translateKindData: feat categories', () => {
  test.each([
    ['deityboon', 'deity-boon'],
    ['calling', 'calling'],
    ['curse', 'curse'],
  ])('a feat of category %s is a %s feat', (foundry, category) => {
    const boon = { ...SUDDEN_CHARGE, system: { ...SUDDEN_CHARGE.system, category: foundry } };
    const feat = translate([boon]);

    expect(dataIn(feat, 'sudden-charge')).toMatchObject({ category });
    expect(gapKeys(feat)).toEqual([]);
  });
});
