import { describe, expect, test } from 'bun:test';

import { dataIn, gapKeys } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import { FOUNDRY_NULL } from './testing/kind-fixtures';
import { CONSECRATE } from './testing/magic-fixtures';

/** Consecrate with `ritual` for its checks and casters, and `more` for the rest of its system. */
function ritualWith(ritual: object, more: object = {}): typeof CONSECRATE {
  return { ...CONSECRATE, system: { ...CONSECRATE.system, ritual, ...more } };
}

describe('translateKindData: rituals Foundry words as free text', () => {
  test('checks that do not map are kept as the text Foundry gives, so the ritual still imports', () => {
    const result = translate([
      ritualWith({
        primary: { check: "skill corresponding to the target's casting tradition (trained)" },
        secondary: { casters: 1, checks: 'Religion (you must be a demon)' },
      }),
    ]);

    expect(dataIn(result, 'consecrate')).toMatchObject({
      primary: { text: "skill corresponding to the target's casting tradition (trained)" },
      secondary: { checks: [{ text: 'Religion (you must be a demon)' }], casters: 1 },
    });
    expect(gapKeys(result)).toEqual([]);
  });

  test('a ritual whose casters Foundry leaves null has none', () => {
    const result = translate([
      ritualWith({ primary: { check: 'Religion (expert)' }, secondary: { casters: FOUNDRY_NULL, checks: '' } }),
    ]);

    expect(dataIn(result, 'consecrate')).toMatchObject({ secondary: { checks: [] } });
    expect(dataIn(result, 'consecrate')).not.toHaveProperty('secondary.casters');
  });

  test('an area of several miles imports', () => {
    const result = translate([
      ritualWith(
        { primary: { check: 'Religion (expert)' }, secondary: { casters: 1, checks: '' } },
        { area: { type: 'emanation', value: 36_960 } },
      ),
    ]);

    expect(dataIn(result, 'consecrate')).toMatchObject({ area: { shape: 'emanation', size: 36_960 } });
  });
});
