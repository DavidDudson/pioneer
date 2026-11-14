import { describe, expect, test } from 'bun:test';

import { MODELLED_IN_PLAY, RUNES, staleGaps, unaccounted } from './property-rune-gaps';

const ETCHED_DAMAGE = 'etched-damage';
/** The Quickened condition of Player Core, which a quickstrike rune grants. */
const QUICKENED = '6517bbf2-8085-534b-be6a-187d52739fa0';

/**
 * Weapon property runes with no activation and no rules in the pack, each with why: a new book's rune must get rules
 * or be listed here with a reason. Remove an entry when its rules land.
 */
const WEAPON_GAPS: ReadonlyMap<string, string> = new Map([
  [
    'rune:animated',
    'an activation with no frequency (Set Free), which the content has no place for (weapon activations story); the released weapon is item state',
  ],
  ['rune:authorized', 'damages a wielder who is not the owner: needs who the rightful owner is, which no state holds'],
  [
    'rune:bane',
    'the engine builds its damage from the etched creature type (`chosenRuneRules`), so `rules` stay empty',
  ],
  [
    'rune:coating',
    'an activation with no frequency, which the content has no place for (weapon activations story), and a store of poisons and oils as item state',
  ],
  ['rune:conducting', 'the engine builds its damage and resonant trait from the etched energy (`chosenRuneRules`)'],
  ['rune:energy-vulnerability', 'the engine builds its weakness from the etched energy (`chosenRuneRules`)'],
  ['rune:energy-vulnerability-greater', 'the engine builds its weakness from the etched energy (`chosenRuneRules`)'],
  [
    'rune:spell-reservoir',
    'two activations with no frequency, which the content has no place for (weapon activations story), and a held spell as item state',
  ],
]);

const WEAPON_GAP_SLUGS: ReadonlySet<string> = new Set(WEAPON_GAPS.keys());

interface EnergyRune {
  readonly slug: string;
  readonly type: string;
  /** Dice of persistent damage added on a critical hit. */
  readonly persistent?: number;
}

/** The extra damage each energy rune adds: one `d6` of its type, and the persistent dice on a critical hit. Greater grades ignore resistance. */
const ENERGY_RUNES: readonly EnergyRune[] = [
  { slug: 'rune:corrosive', type: 'acid' },
  { slug: 'rune:corrosive-greater', type: 'acid' },
  { slug: 'rune:flaming', type: 'fire', persistent: 1 },
  { slug: 'rune:flaming-greater', type: 'fire', persistent: 2 },
  { slug: 'rune:frost', type: 'cold' },
  { slug: 'rune:frost-greater', type: 'cold' },
  { slug: 'rune:shock', type: 'electricity' },
  { slug: 'rune:shock-greater', type: 'electricity' },
  { slug: 'rune:thundering', type: 'sonic' },
  { slug: 'rune:thundering-greater', type: 'sonic' },
];

/** The rules an energy rune is expected to carry. */
function expectedRules({ slug, type, persistent }: EnergyRune): readonly object[] {
  const ignores = slug.endsWith('-greater') ? { ignoreResistance: true } : {};
  const extra = { key: 'DamageDice', selectors: [ETCHED_DAMAGE], damageType: type, ...ignores };
  const persistentDice =
    persistent === undefined
      ? []
      : [{ ...extra, diceNumber: persistent, dieSize: 'd10', category: 'persistent', critical: true }];
  const critical = slug.startsWith('rune:flaming') ? [] : [{ key: 'CriticalEffect', selectors: [ETCHED_DAMAGE] }];
  return [{ ...extra, diceNumber: 1, dieSize: 'd6' }, ...persistentDice, ...critical];
}

describe('weapon property rune rules', () => {
  test('every rune without an activation has rules or a recorded gap', () => {
    expect(unaccounted('weapon', WEAPON_GAP_SLUGS)).toEqual([]);
  });

  test('a recorded gap names a rune that still has no rules', () => {
    expect(staleGaps(WEAPON_GAP_SLUGS)).toEqual([]);
  });

  test('every recorded weapon gap says why', () => {
    const unexplained = [...WEAPON_GAPS].filter(([, reason]) => reason.trim() === '').map(([slug]) => slug);

    expect(unexplained).toEqual([]);
  });

  test('a rune modelled in play is in the content, and has no rules of its own', () => {
    expect(staleGaps(MODELLED_IN_PLAY)).toEqual([]);
  });

  test.each(ENERGY_RUNES)('$slug adds its energy damage to the weapon it is etched on', (rune) => {
    const entry = RUNES.find(({ slug }) => slug === rune.slug);

    expect(entry?.rules).toMatchObject(expectedRules(rune));
  });

  test('wounding adds persistent bleed damage on a hit', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:wounding');

    expect(entry?.rules).toMatchObject([
      {
        key: 'DamageDice',
        selectors: [ETCHED_DAMAGE],
        diceNumber: 1,
        dieSize: 'd6',
        damageType: 'bleed',
        category: 'persistent',
      },
    ]);
  });

  test('returning notes on the attack roll of the weapon it is etched on that the weapon flies back', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:returning');

    expect(entry?.rules).toMatchObject([{ key: 'Note', selectors: ['etched-attack'], title: 'Returning' }]);
  });

  test.each([
    { slug: 'rune:extending', reach: 60 },
    { slug: 'rune:extending-greater', reach: 120 },
  ])(
    '$slug gives the weapon it is etched on a reach of $reach feet while the Extend toggle is on',
    ({ slug, reach }) => {
      const entry = RUNES.find((each) => each.slug === slug);

      expect(entry?.rules).toMatchObject([
        { key: 'RollOption', option: 'option:extend-weapon', toggleable: true },
        {
          key: 'AdjustStrike',
          property: 'reach',
          mode: 'override',
          value: reach,
          etched: true,
          predicate: ['option:extend-weapon'],
        },
      ]);
    },
  );

  test('underwater adds itself to the property runes of the weapon, which the environment reads', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:underwater');

    expect(entry?.rules).toMatchObject([
      { key: 'AdjustStrike', property: 'property-runes', mode: 'add', value: 'underwater', etched: true },
    ]);
  });

  test('quickstrike grants the quickened condition while the weapon is wielded', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:quickstrike');

    expect(entry?.rules).toMatchObject([{ key: 'GrantItem', item: QUICKENED }]);
  });

  test('mythic striking makes the weapon roll five weapon damage dice', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:mythic-striking');

    expect(entry?.rules).toMatchObject([
      { key: 'DamageAlteration', selectors: [ETCHED_DAMAGE], property: 'dice-number', mode: 'override', value: 5 },
    ]);
  });
});
