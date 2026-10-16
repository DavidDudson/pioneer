import { describe, expect, test } from 'bun:test';

import { SlotRank, SpellPreparation } from '@pioneer/rules/sdk';

import { readPathbuilderExport } from './read-pathbuilder-export';
import type { ImportedCaster } from './read-spells';
import { mordredExport } from './testing';

const read = readPathbuilderExport(mordredExport);
if (!read.ok) {
  throw new Error('fixture must read');
}

const { casters } = read.value;

function casterNamed(name: string): ImportedCaster | undefined {
  return casters.find((caster) => caster.name === name);
}

describe('importedCasters', () => {
  const oracle = casterNamed('Oracle');
  const herald = casterNamed('Mortal Herald');

  test('reads every caster in export order', () => {
    expect(casters.map(({ name }) => String(name))).toStrictEqual([
      'Oracle',
      'Archetype Sorcerer',
      'Fey Influence',
      'Fey Ascension',
      'Mortal Herald',
    ]);
  });

  test('reads how a caster casts, and an innate one as neither prepared nor spontaneous', () => {
    expect(oracle?.preparation).toBe(SpellPreparation.Spontaneous);
    expect(herald?.innate).toBe(true);
    expect(herald?.preparation).toBeUndefined();
  });

  test('reads the cantrips as the cantrip rank and the ranks that list a spell, lowest first', () => {
    expect(oracle?.ranks.map(({ rank }) => rank)).toStrictEqual([SlotRank.Cantrip, 1, 2, 3, 4, 5, 6]);
    expect(oracle?.ranks[0]?.spells.map(String)).toContain('Guidance');
  });

  test('keeps the slots per day for the report', () => {
    expect(oracle?.perDay).toStrictEqual([5, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0]);
  });
});
