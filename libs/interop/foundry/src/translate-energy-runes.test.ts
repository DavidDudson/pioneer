import { describe, expect, test } from 'bun:test';

import { KindDataGapReason } from './kind-data-gaps';
import { dataIn, gapKeys } from './testing/build-helpers';
import { physical } from './testing/equipment-fixtures';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';

const ENERGY_RESISTANT = physical(
  { id: 'eNeRgYReS0000001', name: 'Energy-Resistant', type: 'equipment' },
  {
    level: { value: 8 },
    price: { value: { gp: 420 } },
    usage: { value: 'etched-onto-armor' },
  },
);

const ENERGY_RESISTANT_GREATER = physical(
  {
    id: 'eNeRgYReS0000002',
    name: 'Energy-Resistant (Greater)',
    type: 'equipment',
  },
  {
    level: { value: 12 },
    price: { value: { gp: 1650 } },
    usage: { value: 'etched-onto-armor' },
  },
);

function armor(id: string, name: string, property: string[]): DocumentFixture {
  return physical(
    { id, name, type: 'armor' },
    {
      acBonus: 4,
      baseItem: 'breastplate',
      bulk: { value: 2 },
      category: 'heavy',
      checkPenalty: -2,
      dexCap: 1,
      group: 'plate',
      level: { value: 10 },
      price: { value: { gp: 975 } },
      runes: { potency: 1, property, resilient: 1 },
      speedPenalty: -5,
      strength: 3,
    },
  );
}

const SMOLDERING = armor('sMoLdErInG000001', 'Smoldering Armor', ['fireResistant']);
const OUROBOROS = armor('oUrOb0r0s0000001', 'Ouroboros Buckles', ['greaterAcidResistant']);
const SONIC = armor('s0N1cArMoR000001', 'Sonic Armor', ['sonicResistant']);

const translation = translate([ENERGY_RESISTANT, ENERGY_RESISTANT_GREATER, SMOLDERING, OUROBOROS, SONIC]);

describe('translateKindData: legacy energy-resistant property runes', () => {
  test("a legacy key is the remaster's energy-resistant rune with the energy it names", () => {
    expect(dataIn(translation, 'smoldering-armor')).toMatchObject({
      runes: {
        property: [idOf('rune:energy-resistant')],
        propertyEnergy: { [idOf('rune:energy-resistant')]: 'fire' },
      },
    });
  });

  test('a greater key is the greater rune', () => {
    expect(dataIn(translation, 'ouroboros-buckles')).toMatchObject({
      runes: {
        property: [idOf('rune:energy-resistant-greater')],
        propertyEnergy: { [idOf('rune:energy-resistant-greater')]: 'acid' },
      },
    });
  });

  test('an energy the remaster rune is not made for stays reported, not guessed', () => {
    expect(dataIn(translation, 'sonic-armor')).toMatchObject({
      runes: { property: [] },
    });
    expect(gapKeys(translation)).toContain(`${KindDataGapReason.UnresolvedReference} runes.property`);
  });
});
