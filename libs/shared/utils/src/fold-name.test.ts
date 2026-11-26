import { describe, expect, test } from 'bun:test';

import { foldDiacritics, foldName } from './fold-name';

describe('foldName', () => {
  test('ignores case', () => {
    expect(foldName('Power ATTACK')).toBe('power attack');
  });

  test.each([
    ["Nature's Reprisal", 'natures reprisal'],
    ['Nature’s Reprisal', 'natures reprisal'],
    ['Nature‘s Reprisal', 'natures reprisal'],
    ['Nature`s Reprisal', 'natures reprisal'],
  ])('drops the apostrophe in %p', (name, key) => {
    expect(foldName(name)).toBe(key);
  });

  test('drops accents, composed or not', () => {
    expect(foldName('Déjà Vu')).toBe('deja vu');
    expect(foldName('Déjà Vu')).toBe('deja vu');
  });

  test('folds compatibility forms', () => {
    expect(foldName('Ｆｉｒｅ')).toBe('fire');
  });

  test('turns punctuation into one space', () => {
    expect(foldName('Healing Potion (Moderate)')).toBe('healing potion moderate');
    expect(foldName('Healing Potion, Moderate')).toBe('healing potion moderate');
    expect(foldName('Hand-Cannon')).toBe('hand cannon');
    expect(foldName('  Spaced   Out  ')).toBe('spaced out');
  });

  test('keeps digits and drops signs', () => {
    expect(foldName('Potency Crystal +1')).toBe('potency crystal 1');
  });

  test('leaves an empty name empty', () => {
    expect(foldName('')).toBe('');
  });
});

describe('foldDiacritics', () => {
  test('removes accents and keeps everything else', () => {
    expect(foldDiacritics('déjà-vu')).toBe('deja-vu');
    expect(foldDiacritics("Élan's Reach")).toBe("Elan's Reach");
  });
});
