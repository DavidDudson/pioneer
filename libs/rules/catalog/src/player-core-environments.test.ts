import { describe, expect, test } from 'bun:test';

import { ContentKind, contentPackFromContents, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { playerCorePack } from './json-packs';

const PLAYER_CORE = contentPackFromContents(await playerCorePack()).otherEntries;

function environment(slug: string): ContentEntry {
  const found = PLAYER_CORE.find((entry) => entry.slug === slug);
  if (found === undefined) {
    throw new Error(`${slug} is not in the player-core entries`);
  }
  return found;
}

describe('Player Core light environments', () => {
  test.each(['environment:dim-light', 'environment:darkness'])('%s cites Light on Player Core page 432', (slug) => {
    const { kind, sources } = environment(slug);

    expect(kind).toBe(ContentKind.Environment);
    expect(sources).toMatchObject([{ kind: 'book', book: 'player-core', page: 432 }]);
  });

  test.each(['environment:dim-light', 'environment:darkness'])(
    '%s notes what it does to the seeker on attack and Perception rolls',
    (slug) => {
      const note = environment(slug).rules.find((rule) => rule.key === RuleElementKey.Note);

      expect(note).toMatchObject({ selectors: ['attack-roll', 'perception'] });
    },
  );
});

describe('Player Core terrain environments', () => {
  test.each([
    'environment:difficult-terrain',
    'environment:greater-difficult-terrain',
    'environment:hazardous-terrain',
  ])('%s is an environment citing Terrain on Player Core page 423', (slug) => {
    const { kind, sources } = environment(slug);

    expect(kind).toBe(ContentKind.Environment);
    expect(sources).toMatchObject([{ kind: 'book', book: 'player-core', page: 423 }]);
  });
});
