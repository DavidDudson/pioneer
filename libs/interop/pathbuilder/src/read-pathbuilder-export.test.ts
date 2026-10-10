import { describe, expect, test } from 'bun:test';

import { Attribute, Proficiency } from '@pioneer/rules/sdk';

import briarRose from './fixtures/briar-rose.json';
import { ImportKind } from './import-kind';
import type { ImportKind as ImportKindType } from './import-kind';
import { PathbuilderProblem, readPathbuilderExport } from './read-pathbuilder-export';
import type { PathbuilderImport } from './read-pathbuilder-export';

function read(input: unknown): PathbuilderImport {
  const result = readPathbuilderExport(input);
  if (!result.ok) {
    throw new Error(`Expected a readable export, got ${result.problem}`);
  }
  return result.value;
}

function problemOf(input: unknown): PathbuilderProblem | undefined {
  const result = readPathbuilderExport(input);
  return result.ok ? undefined : result.problem;
}

function issuePaths(input: unknown): readonly (readonly PropertyKey[])[] {
  const result = readPathbuilderExport(input);
  return result.ok ? [] : result.issues.map((issue) => issue.path);
}

function namesOf(value: PathbuilderImport, kind: ImportKindType): readonly string[] {
  return value.names.filter((entry) => entry.kind === kind).map((entry) => entry.name);
}

const minimal = {
  success: true,
  build: {
    name: 'Valeros',
    class: 'Fighter',
    level: 1,
    ancestry: 'Human',
    heritage: 'Versatile Human',
    background: 'Farmhand',
    abilities: { str: 18, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    feats: [],
  },
};

describe('readPathbuilderExport: golden fixture (Briar Rose)', () => {
  const briar = read(briarRose);

  test('reads identity, level and class with dual class', () => {
    expect<string>(briar.name).toBe('Briar Rose');
    expect<number>(briar.level).toBe(11);
    expect<object>(briar.identity).toEqual({
      ancestry: 'Goloma',
      heritage: 'Vigilant Goloma',
      background: 'Dendrologist',
      classes: ['Animist', 'Druid'],
    });
  });

  test('turns attribute scores into remaster modifiers', () => {
    expect<Record<string, number>>(briar.attributes.toWire()).toEqual({
      [Attribute.Strength]: 0,
      [Attribute.Dexterity]: 3,
      [Attribute.Constitution]: 4,
      [Attribute.Intelligence]: 3,
      [Attribute.Wisdom]: 5,
      [Attribute.Charisma]: 0,
    });
  });

  test('collects every feat, awarded ones included, in export order', () => {
    const feats = namesOf(briar, ImportKind.Feat);
    expect(feats).toHaveLength(32);
    expect(feats.slice(0, 2)).toEqual(['Circle of Spirits', 'Leshy Familiar']);
    expect(feats.at(-1)).toBe('Break Curse');
  });

  test('collects spells from every caster and focus spells, repeats kept', () => {
    const spells = namesOf(briar, ImportKind.Spell);
    expect(spells.filter((name) => name === 'Impaling Spike')).toHaveLength(2);
    expect(spells).toContain('Detect Magic');
    expect(spells).toContain('Oaken Resilience');
    expect(spells).toContain('Cornucopia');
    expect(spells).toContain('Waking Dream');
  });

  test('skips placeholders: unset deity and Pathbuilder\'s "Unarmored" armour rows', () => {
    expect(namesOf(briar, ImportKind.Deity)).toEqual([]);
    expect(namesOf(briar, ImportKind.Item)).not.toContain('Unarmored');
    expect(namesOf(briar, ImportKind.Item)).toHaveLength(18);
  });

  test('carries rituals, languages and lores with ranks', () => {
    expect(namesOf(briar, ImportKind.Ritual)).toEqual(['Call Spirit']);
    expect(namesOf(briar, ImportKind.Language)).toEqual(['Common', 'Fey', 'Goloma', 'Muan', 'Wildsong']);
    expect<object | undefined>(briar.lores[0]).toEqual({ name: 'Enchantment', rank: Proficiency.Master });
    expect(briar.lores.find((lore) => lore.name === 'Wild Mimic')?.rank).toBe(Proficiency.Untrained);
  });

  test("keeps Pathbuilder's computed values apart, untouched", () => {
    expect(briar.reported.acTotal?.acTotal).toBe(30);
    expect(briar.reported.proficiencies['will']).toBe(6);
    expect(briar.reported.mods['Nature']).toEqual({ 'Potency Bonus': 2 });
  });
});

describe('readPathbuilderExport', () => {
  test('reads JSON text as well as a parsed object', () => {
    expect(read(JSON.stringify(minimal))).toEqual(read(minimal));
  });

  test('defaults what an older export leaves out', () => {
    const value = read(minimal);
    expect<readonly string[]>(value.identity.classes).toEqual(['Fighter']);
    expect(value.lores).toEqual([]);
    expect(namesOf(value, ImportKind.Spell)).toEqual([]);
    expect(value.reported.proficiencies).toEqual({});
  });

  test('tolerates fields it does not know', () => {
    const extended = { ...minimal, version: 3, build: { ...minimal.build, newThing: { nested: true } } };
    expect(readPathbuilderExport(extended).ok).toBe(true);
  });

  test('rounds odd scores down (ADR-0014)', () => {
    const value = read({ ...minimal, build: { ...minimal.build, abilities: { ...minimal.build.abilities, dex: 9 } } });
    expect<number>(value.attributes.get(Attribute.Dexterity)).toBe(-1);
  });

  test.each([
    ['text that is not JSON', '{ nope'],
    ['JSON that is not an export', { hello: 'world' }],
    ['an export without a build', { success: true }],
    ['a level out of range', { ...minimal, build: { ...minimal.build, level: 21 } }],
    ['a blank name', { ...minimal, build: { ...minimal.build, name: '   ' } }],
    ['an unset ancestry', { ...minimal, build: { ...minimal.build, ancestry: 'Not set' } }],
  ])('refuses %s as malformed', (_label, input) => {
    expect(problemOf(input)).toBe(PathbuilderProblem.Malformed);
  });

  test('reports a failed Pathbuilder export as its own problem', () => {
    expect(problemOf({ success: false })).toBe(PathbuilderProblem.ExportFailed);
  });

  test('points issues at the field that failed', () => {
    expect(issuePaths({ ...minimal, build: { ...minimal.build, name: 'x'.repeat(81) } })).toEqual([['build', 'name']]);
  });
});
