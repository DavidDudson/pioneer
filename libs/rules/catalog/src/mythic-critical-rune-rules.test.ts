import { describe, expect, test } from 'bun:test';

import { loadRunes } from './rune-fixtures';

const ETCHED_DAMAGE = 'etched-damage';
/** The rule a mythic potency rune carries: it raises the potency of the item it is etched onto to +4. */
const MYTHIC_POTENCY = { key: 'ItemAlteration', etched: true, property: 'potency', mode: 'upgrade', value: 4 };

const RUNES = await loadRunes();

describe('mythic potency and critical effect rune rules', () => {
  test('mythic weapon potency raises the etched weapon to +4 potency', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:mythic-weapon-potency');

    expect(entry?.rules).toMatchObject([MYTHIC_POTENCY]);
  });

  test('pacifying asks a Will save on any hit, as a reaction', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:pacifying');

    expect(entry?.rules).toMatchObject([
      {
        key: 'CriticalEffect',
        selectors: [ETCHED_DAMAGE],
        trigger: 'hit',
        reaction: true,
        effect: { kind: 'pacify', penalty: -2, save: { statistic: 'will', dc: 20 } },
      },
    ]);
  });

  test('vorpal asks a Fortitude save on a natural 20, as a reaction', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:vorpal');

    expect(entry?.rules).toMatchObject([
      {
        key: 'CriticalEffect',
        selectors: [ETCHED_DAMAGE],
        trigger: 'natural-twenty',
        reaction: true,
        effect: { kind: 'decapitate', save: { statistic: 'fortitude', dc: 37 } },
      },
    ]);
  });

  test('grievous adds to the critical specialization of the weapon it is etched onto', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:grievous');

    expect(entry?.rules).toMatchObject([{ key: 'CriticalSpecialization', grievous: true, etched: true }]);
  });

  test('mythic armor potency raises the etched armour to +4 potency', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:mythic-armor-potency');

    expect(entry?.rules).toMatchObject([MYTHIC_POTENCY]);
  });
});
