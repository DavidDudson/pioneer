import { describe, expect, test } from 'bun:test';

import { ContentKind, contentPackFromContents, EnvironmentData } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { gmCorePack, playerCorePack } from './json-packs';

const GM_CORE = contentPackFromContents(await gmCorePack()).otherEntries;
const PLAYER_CORE = contentPackFromContents(await playerCorePack());

function environment(slug: string): ContentEntry {
  const found = GM_CORE.find((entry) => entry.slug === slug);
  if (found === undefined) {
    throw new Error(`${slug} is not in the gm-core entries`);
  }
  return found;
}

function fatiguedId(): string {
  const found = PLAYER_CORE.otherEntries.find(({ slug }) => slug === 'condition:fatigued');
  if (found === undefined) {
    throw new Error('condition:fatigued is not in the player-core entries');
  }
  return found.id;
}

const damage = (slug: string): unknown =>
  EnvironmentData.parse(environment(slug).data).consequences.filter((each) => each.damage !== undefined);

const fatigue = (slug: string): unknown =>
  EnvironmentData.parse(environment(slug).data).consequences.find((each) => each.applies !== undefined);

describe('GM Core temperature environments', () => {
  test('has Mild, Severe, Extreme and Incredible Cold and Heat citing GM Core page 95', () => {
    for (const kind of ['cold', 'heat']) {
      for (const tier of ['mild', 'severe', 'extreme', 'incredible']) {
        const { kind: entryKind, sources } = environment(`environment:${tier}-${kind}`);

        expect(entryKind).toBe(ContentKind.Environment);
        expect(sources).toMatchObject([{ kind: 'book', book: 'gm-core', page: 95 }]);
      }
    }
  });

  test('deals damage on the Temperature schedule: cold is cold, heat is fire', () => {
    expect(damage('environment:mild-cold')).toEqual([]);
    expect(damage('environment:severe-cold')).toEqual([
      { after: { count: 1, unit: 'hour' }, damage: { category: 'minor', type: 'cold' }, repeats: true },
    ]);
    expect(damage('environment:extreme-heat')).toEqual([
      { after: { count: 10, unit: 'minute' }, damage: { category: 'minor', type: 'fire' }, repeats: true },
    ]);
    expect(damage('environment:incredible-heat')).toEqual([
      { after: { count: 1, unit: 'minute' }, damage: { category: 'moderate', type: 'fire' }, repeats: true },
    ]);
  });

  test('makes the character Fatigued after 4 hours, or 2 in incredible temperatures', () => {
    expect(fatigue('environment:mild-heat')).toEqual({ after: { count: 4, unit: 'hour' }, applies: fatiguedId() });
    expect(fatigue('environment:incredible-cold')).toEqual({
      after: { count: 2, unit: 'hour' },
      applies: fatiguedId(),
    });
  });

  test('wind is a note with no consequences', () => {
    const wind = environment('environment:wind');

    expect(wind.rules).toMatchObject([{ key: 'Note' }]);
    expect(EnvironmentData.parse(wind.data).consequences).toEqual([]);
  });
});

describe('GM Core biome environments', () => {
  const BIOMES = ['aquatic', 'arctic', 'desert', 'forest', 'mountain', 'plains', 'swamp', 'underground', 'urban'];

  test('has a biome for each GM Core environment, citing pages 90 to 94', () => {
    for (const biome of BIOMES) {
      const { kind, sources } = environment(`environment:${biome}`);

      expect(kind).toBe(ContentKind.Environment);
      expect(sources).toMatchObject([{ kind: 'book', book: 'gm-core' }]);
    }
  });

  test('sets the terrain roll option feats read, and is in no group so it stacks with anything', () => {
    for (const biome of BIOMES) {
      const entry = environment(`environment:${biome}`);

      expect(entry.rules).toContainEqual({ key: 'RollOption', option: `terrain:${biome}` });
      expect(EnvironmentData.parse(entry.data).group).toBeUndefined();
    }
  });

  test('puts every cold and heat tier in the temperature group, so one replaces another', () => {
    for (const kind of ['cold', 'heat']) {
      for (const tier of ['mild', 'severe', 'extreme', 'incredible']) {
        expect(EnvironmentData.parse(environment(`environment:${tier}-${kind}`).data).group).toBe('temperature');
      }
    }
  });
});

const byGroup = (slug: string): unknown => {
  const found = PLAYER_CORE.otherEntries.find((entry) => entry.slug === slug);
  return found === undefined ? undefined : EnvironmentData.parse(found.data).group;
};

describe('Player Core terrain environments', () => {
  test('difficult and greater difficult terrain replace each other, and hazardous terrain stacks with both', () => {
    expect(byGroup('environment:difficult-terrain')).toBe('terrain-difficulty');
    expect(byGroup('environment:greater-difficult-terrain')).toBe('terrain-difficulty');
    expect(byGroup('environment:hazardous-terrain')).toBeUndefined();
  });

  test('underwater sets the terrain options feats read', () => {
    const underwater = PLAYER_CORE.otherEntries.find((entry) => entry.slug === 'environment:underwater');

    expect(underwater?.rules).toContainEqual({ key: 'RollOption', option: 'terrain:underwater' });
  });
});
