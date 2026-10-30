import { describe, expect, test } from 'bun:test';

import { KindDataGapReason } from './kind-data-gaps';
import { dataIn, gapKeys, slugIn } from './testing/build-helpers';
import { EQUIPMENT, HEALING_POTION, physical } from './testing/equipment-fixtures';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { gapsOf } from './testing/kind-fixtures';

const translation = translate(EQUIPMENT);

describe('translateKindData: consumables and ammunition', () => {
  test('a held spell with no entry is reported with the book it is printed in', () => {
    const wand = physical(
      { id: 'wAnDoFcInDeR0001', name: 'Magic Wand (4th-Rank Spell)', type: 'consumable' },
      {
        bulk: { value: 0.1 },
        category: 'wand',
        level: { value: 8 },
        price: { per: 1, value: { gp: 700 } },
        spell: {
          name: 'Cinder Swarm',
          system: {
            level: { value: 4 },
            publication: { license: 'ORC', remaster: true, title: 'Pathfinder Rage of Elements' },
            slug: 'cinder-swarm',
          },
        },
        usage: { value: 'held-in-one-hand' },
        uses: { autoDestroy: false, max: 1, value: 1 },
      },
    );

    expect(gapsOf(translate([wand]))).toContainEqual({
      reason: KindDataGapReason.UnresolvedReference,
      field: 'spell',
      raw: { spell: 'cinder-swarm', book: 'Pathfinder Rage of Elements' },
    });
  });

  test('a potion has its healing', () => {
    expect(dataIn(translation, 'healing-potion-minor')).toEqual({
      price: { coins: { gp: 4 } },
      bulk: 'negligible',
      category: 'potion',
      usage: { type: 'held', hands: 'one' },
      damage: { formula: '1d8', damageType: 'vitality', kind: 'healing' },
    });
  });

  test('a wand holds its spell at its rank and is kept once spent', () => {
    expect(dataIn(translation, 'magic-wand-3rd-rank-spell')).toMatchObject({
      category: 'wand',
      kept: true,
      spell: { spell: idOf('spell:fireball'), rank: 3 },
    });
  });

  test('untyped healing keeps its formula and has no damage type', () => {
    const elixir = physical(
      { id: 'eLiXiR0000000001', name: 'Elixir of Life', type: 'consumable' },
      {
        ...HEALING_POTION.system,
        damage: { formula: '1d6', kind: 'healing', type: 'untyped' },
      },
    );
    const lone = translate([elixir]);

    expect(dataIn(lone, 'elixir-of-life')).toMatchObject({ damage: { formula: '1d6', kind: 'healing' } });
    expect(dataIn(lone, 'elixir-of-life')).not.toHaveProperty('damage.damageType');
    expect(gapKeys(lone)).toEqual([]);
  });

  test('a damage type Pioneer lacks is reported and the damage left out', () => {
    const elixir = physical(
      { id: 'eLiXiR0000000002', name: 'Odd Elixir', type: 'consumable' },
      { ...HEALING_POTION.system, damage: { formula: '1d6', kind: 'healing', type: 'unheard-of' } },
    );
    const lone = translate([elixir]);

    expect(dataIn(lone, 'odd-elixir')).not.toHaveProperty('damage');
    expect(gapKeys(lone)).toEqual([`${KindDataGapReason.UnmappedValue} damage.type`]);
  });

  test('ammunition is a consumable fired as its kind, its Bulk for a stack of ten', () => {
    expect(slugIn(translation, 'arrows')).toBe('consumable:arrows');
    expect(dataIn(translation, 'arrows')).toEqual({
      price: { coins: { sp: 1 }, per: 10 },
      bulk: 'light',
      bulkPer: 10,
      category: 'ammunition',
      ammunition: ['arrows'],
    });
    expect(dataIn(translation, 'beacon-shot')).toMatchObject({ ammunition: ['arrows', 'bolts'] });
  });
});

function alignment(id: string, name: string, usage: string): DocumentFixture {
  return physical({ id, name, type: 'equipment' }, { usage: { value: usage } });
}

describe('translateKindData: runes', () => {
  test('equipment etched onto an item is a rune', () => {
    expect(slugIn(translation, 'flaming')).toBe('rune:flaming');
    expect(dataIn(translation, 'flaming')).toEqual({
      price: { coins: { gp: 500 } },
      bulk: 'negligible',
      type: 'property',
      etchedOnto: { item: 'weapon' },
    });
  });

  test('a fundamental rune has its rune and grade, a restricted one its restriction', () => {
    expect(dataIn(translation, 'striking-greater')).toMatchObject({
      type: 'fundamental',
      rune: 'striking',
      grade: 2,
      etchedOnto: { item: 'weapon' },
    });
    expect(dataIn(translation, 'fortification')).toMatchObject({
      etchedOnto: { item: 'armor', restriction: 'medium-or-heavy' },
    });
  });

  test('a rune for monks is etched onto a melee weapon a monk uses', () => {
    const flurrying = translate([alignment('fLuRrY0000000001', 'Flurrying', 'etched-onto-melee-weapon-monk')]);

    expect(dataIn(flurrying, 'flurrying')).toMatchObject({
      etchedOnto: { item: 'weapon', restriction: 'monk-melee' },
    });
    expect(gapKeys(flurrying)).toEqual([]);
  });

  test('the alignment runes are etched onto a weapon without the opposite rune (Foundry labels them swapped)', () => {
    const alignments = translate([
      alignment('hOlY000000000001', 'Holy', 'etched-onto-weapon-wo-holy-rune'),
      alignment('uNhOlY0000000001', 'Unholy', 'etched-onto-weapon-wo-unholy-rune'),
    ]);

    expect(dataIn(alignments, 'holy')).toMatchObject({
      etchedOnto: { item: 'weapon', restriction: 'without-unholy-rune' },
    });
    expect(dataIn(alignments, 'unholy')).toMatchObject({
      etchedOnto: { item: 'weapon', restriction: 'without-holy-rune' },
    });
    expect(gapKeys(alignments)).toEqual([]);
  });
});
