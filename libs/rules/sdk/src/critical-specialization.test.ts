import { describe, expect, test } from 'bun:test';

import { criticalSpecializationOf } from './critical-specialization';
import { WeaponGroup } from './weapon';

const GROUPS: readonly WeaponGroup[] = Object.values(WeaponGroup);

describe('criticalSpecializationOf', () => {
  test.each(GROUPS)('%s has an effect, headed by its name', (group) => {
    const text = JSON.stringify(criticalSpecializationOf(group));

    expect(text).toContain(`Critical specialization (${group}).`);
    expect(text.length).toBeGreaterThan(`Critical specialization (${group}).`.length + 40);
  });

  test('reads as Player Core words it: a DC 10 Athletics check to free a bow missile, a 10-foot bomb splash', () => {
    expect(JSON.stringify(criticalSpecializationOf(WeaponGroup.Bow))).toContain('DC 10 Athletics check');
    expect(JSON.stringify(criticalSpecializationOf(WeaponGroup.Bomb))).toContain('to 10 feet');
  });
});
