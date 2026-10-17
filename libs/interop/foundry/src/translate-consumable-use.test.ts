import { describe, expect, test } from 'bun:test';

import { KindDataGapReason } from './kind-data-gaps';
import { dataIn } from './testing/build-helpers';
import { physical } from './testing/equipment-fixtures';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL, gapsOf } from './testing/kind-fixtures';

const EFFECT: DocumentFixture = {
  id: 'eLiXiRlIfEeFfEcT',
  name: 'Effect: Elixir of Life',
  type: 'effect',
  system: { duration: { expiry: 'turn-start', sustained: false, unit: 'hours', value: 1 } },
};
const EFFECT_UUID = `Compendium.pf2e.equipment-effects.Item.${EFFECT.id}`;

function consumable(fixture: DocumentFixture, category: string, description: string): DocumentFixture {
  return physical(fixture, {
    category,
    damage: FOUNDRY_NULL,
    description: { value: description },
    spell: FOUNDRY_NULL,
    usage: { value: 'held-in-one-hand' },
    uses: { autoDestroy: true, max: 1, value: 1 },
  });
}

const POTION = consumable(
  { id: 'eLiXiRoFlIfE0001', name: 'Elixir of Life', type: 'consumable' },
  'elixir',
  `<p><strong>Activate</strong> <span class="action-glyph">1</span> Interact</p><p>You gain @UUID[${EFFECT_UUID}]{Effect: Elixir of Life}.</p>`,
);
const SCROLL = consumable(
  { id: 'sCrOlLoFfIrEbAl1', name: 'Scroll of Fireball', type: 'consumable' },
  'scroll',
  '<p><strong>Activate</strong> <span class="action-glyph">3</span> Cast a Spell</p>',
);
const BOMB = consumable(
  { id: 'aLcHeMiStFiRe001', name: 'Alchemist Fire', type: 'consumable' },
  'gadget',
  '<p><strong>Activate—Throw</strong> <span class="action-glyph">a</span> Strike</p>',
);
const PLAIN = consumable(
  { id: 'pLaInDrAuGhT0001', name: 'Plain Draught', type: 'consumable' },
  'potion',
  '<p>A bitter drink.</p>',
);

const translation = translate([EFFECT, POTION, SCROLL, BOMB, PLAIN]);

describe('translateKindData: consumable use', () => {
  test('a potion has its activation and the effect it links', () => {
    expect(dataIn(translation, 'elixir-of-life')).toMatchObject({
      activation: { cost: 'one' },
      effect: idOf('effect:effect-elixir-of-life'),
    });
  });

  test('a scroll costs the actions its glyph shows', () => {
    expect(dataIn(translation, 'scroll-of-fireball')).toMatchObject({ activation: { cost: 'three' } });
  });

  test('a bomb with a named activation costs its glyph', () => {
    expect(dataIn(translation, 'alchemist-fire')).toMatchObject({ activation: { cost: 'one' } });
  });

  test('a consumable with no Activate line has no activation and no effect', () => {
    const data = dataIn(translation, 'plain-draught');

    expect(data).not.toHaveProperty('activation');
    expect(data).not.toHaveProperty('effect');
  });

  test('an effect link naming no entry is reported and left out', () => {
    const lone = translate([POTION]);

    expect(dataIn(lone, 'elixir-of-life')).not.toHaveProperty('effect');
    expect(gapsOf(lone)).toContainEqual({
      reason: KindDataGapReason.UnresolvedReference,
      field: 'effect',
      raw: EFFECT_UUID,
    });
  });

  test('a glyph that is not one cost is reported and the activation left out', () => {
    const odd = consumable(
      { id: 'oDdDrAuGhT000001', name: 'Odd Draught', type: 'consumable' },
      'potion',
      '<p><strong>Activate</strong> <span class="action-glyph">1 to 3</span> Interact</p>',
    );
    const lone = translate([odd]);

    expect(dataIn(lone, 'odd-draught')).not.toHaveProperty('activation');
    expect(gapsOf(lone)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'description.activate',
      raw: '1 to 3',
    });
  });
});
