import { describe, expect, test } from 'bun:test';

import { classifyRemasterCandidate, normaliseName } from './remaster-audit';

const PACK_NAMES: ReadonlySet<string> = new Set(
  ['Eagle-Eye Elixir', 'Alacritous Horseshoes', 'Eagle Eye Lens', 'Birchstaff'].map((name) => normaliseName(name)),
);

function classify(type: string, name: string): string {
  return classifyRemasterCandidate({ type, name }, PACK_NAMES);
}

describe('classifyRemasterCandidate', () => {
  test('an action row named only by its traits is an activation', () => {
    expect(classify('Action', '(concentrate)')).toBe('activation');
    expect(classify('Action', '(concenctrate, manipulate)')).toBe('activation');
    expect(classify('Action', '(aura, concentrate, fire)')).toBe('activation');
  });

  test('a named action row is not an activation', () => {
    expect(classify('Action', 'Eagle Eye Lens (concentrate)')).toBe('review');
  });

  test('a page type with no content kind is a missing kind', () => {
    expect(classify('Traits', 'Aquadynamic')).toBe('missing-kind');
    expect(classify('Vehicles', 'Chariot')).toBe('missing-kind');
  });

  test('page furniture is a non-entry', () => {
    expect(classify('Sidebar', 'Flat Checks')).toBe('non-entry');
    expect(classify('Source', 'Player Core')).toBe('non-entry');
  });

  test('material grades, tiers, runes and generic magic items are variants', () => {
    expect(classify('Equipment', 'Silver Armor (Low-Grade)')).toBe('variant');
    expect(classify('Equipment', 'Cold Iron')).toBe('variant');
    expect(classify('Equipment', 'Eagle-Eye Elixir (Greater)')).toBe('variant');
    expect(classify('Equipment', 'Major Birchstaff')).toBe('variant');
    expect(classify('Equipment', 'Magic Weapon (+2 Greater Striking)')).toBe('variant');
    expect(classify('Equipment', '3rd-rank Scroll')).toBe('variant');
  });

  test('a tier of an item the packs lack is not a variant', () => {
    expect(classify('Equipment', 'Greater Mystery Orb')).toBe('review');
  });

  test('a name one edit from a pack name is a typo', () => {
    expect(classify('Equipment', 'Alacritous Horsehoes')).toBe('typo');
  });

  test('anything else is left for review', () => {
    expect(classify('Feats', 'Totally New Feat')).toBe('review');
  });
});
