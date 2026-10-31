import { describe, expect, test } from 'bun:test';

import { RUNIC_LETTERS, runicPair } from './runic-pair';

describe('the runic letters', () => {
  test('hold the 83 letters of the Runic block and no punctuation', () => {
    expect(RUNIC_LETTERS).toHaveLength(83);
    expect(RUNIC_LETTERS).not.toContain('᛫');
    expect(RUNIC_LETTERS).not.toContain('ᛰ');
  });
});

describe('a runic pair', () => {
  test('is the same two Runic letters for the same text', () => {
    const pair = runicPair('flaming');
    const letters = pair.split('');

    expect(runicPair('flaming')).toBe(pair);
    expect(letters).toHaveLength(2);
    expect(letters.filter((letter) => RUNIC_LETTERS.includes(letter))).toHaveLength(2);
  });

  test('tells apart the texts of many runes', () => {
    const texts = Array.from({ length: 150 }, (_unused, index) => `rune-${index}`);
    const pairs = new Set(texts.map((text) => runicPair(text)));

    expect(pairs.size).toBeGreaterThan(140);
  });
});
