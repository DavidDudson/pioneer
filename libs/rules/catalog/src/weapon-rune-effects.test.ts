import { describe, expect, test } from 'bun:test';

import { loadRunes } from './rune-fixtures';

const RUNES = await loadRunes();

describe('weapon property rune effects', () => {
  test('ghost touch makes the weapon it is etched on count as having the rune', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:ghost-touch');

    expect(entry?.rules).toMatchObject([
      { key: 'AdjustStrike', property: 'property-runes', mode: 'add', value: 'ghost-touch', etched: true },
    ]);
  });

  test.each([
    { slug: 'rune:brilliant', ignoring: {} },
    { slug: 'rune:brilliant-greater', ignoring: { ignoreResistance: true } },
  ])('$slug adds fire damage, and spirit to fiends and vitality to undead', ({ slug, ignoring }) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([
      { key: 'DamageDice', damageType: 'fire', diceNumber: 1, dieSize: 'd4', ...ignoring },
      { damageType: 'spirit', predicate: ['target:trait:fiend'], ...ignoring },
      { damageType: 'vitality', predicate: ['target:trait:undead'], ...ignoring },
    ]);
  });

  test.each([
    { slug: 'rune:vitalizing', dice: 1 },
    { slug: 'rune:vitalizing-greater', dice: 2 },
  ])('$slug adds persistent vitality damage to undead, with a critical hit note', ({ slug, dice }) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([
      {
        key: 'DamageDice',
        diceNumber: dice,
        dieSize: 'd6',
        damageType: 'vitality',
        category: 'persistent',
        predicate: ['target:trait:undead'],
      },
      { key: 'Note', outcome: ['criticalSuccess'], predicate: ['target:trait:undead'] },
    ]);
  });

  test.each([
    { slug: 'rune:impactful', feet: 5 },
    { slug: 'rune:impactful-greater', feet: 10 },
  ])('$slug adds force damage and a push on a critical hit', ({ slug, feet }) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([
      { key: 'DamageDice', diceNumber: 1, dieSize: 'd6', damageType: 'force' },
      { key: 'Note', outcome: ['criticalSuccess'], title: 'Impactful' },
    ]);
    expect(JSON.stringify(entry?.rules)).toContain(`pushed ${feet} feet`);
  });

  test.each([
    { slug: 'rune:decaying', persistent: 2, ignoring: {} },
    { slug: 'rune:decaying-greater', persistent: 4, ignoring: { ignoreResistance: true } },
  ])('$slug adds void damage, and persistent void on a critical hit', ({ slug, persistent, ignoring }) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([
      { key: 'DamageDice', diceNumber: 1, dieSize: 'd4', damageType: 'void', ...ignoring },
      {
        key: 'DamageDice',
        diceNumber: persistent,
        dieSize: 'd4',
        damageType: 'void',
        category: 'persistent',
        critical: true,
        ...ignoring,
      },
    ]);
  });

  test.each([
    { slug: 'rune:fearsome', value: 1 },
    { slug: 'rune:fearsome-greater', value: 2 },
  ])('$slug makes the target Frightened $value on a critical hit', ({ slug, value }) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([{ key: 'Note', outcome: ['criticalSuccess'] }]);
    expect(JSON.stringify(entry?.rules)).toContain(`Frightened ${value}`);
  });

  test('merciful gives its weapon the nonlethal trait', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:merciful');

    expect(entry?.rules).toMatchObject([
      { key: 'AdjustStrike', property: 'traits', mode: 'add', value: 'nonlethal', etched: true },
      { key: 'Note', outcome: ['criticalSuccess'] },
    ]);
  });
});
