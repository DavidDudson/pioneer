import { describe, expect, it } from 'bun:test';

import { CHARACTER_FLAWS, CHARACTER_NAMES, CHARACTER_TRAITS } from './character-roll-tables';
import { Seed } from './pick-source';
import { rollPersona } from './roll-persona';
import { RollTable } from './roll-table';

describe('rollPersona', () => {
  it('gives the same persona for the same seed', () => {
    expect(rollPersona(Seed.parse(42))).toEqual(rollPersona(Seed.parse(42)));
  });

  it('names the character from the name table and writes a trait and a flaw', () => {
    const persona = rollPersona(Seed.parse(7));
    expect(CHARACTER_NAMES.entries.map(String)).toContain(persona.name);
    expect(persona.personality).toHaveLength(2);
  });

  it('can reach every line of a table', () => {
    const names = new Set(Array.from({ length: 400 }, (_unused, seed) => rollPersona(Seed.parse(seed)).name));
    expect(names.size).toBe(CHARACTER_NAMES.entries.length);
  });
});

describe('character roll tables', () => {
  it.each([CHARACTER_NAMES, CHARACTER_TRAITS, CHARACTER_FLAWS])('$id is a valid table without repeats', (table) => {
    expect(RollTable.safeParse(table).success).toBe(true);
    expect(new Set(table.entries).size).toBe(table.entries.length);
  });
});
