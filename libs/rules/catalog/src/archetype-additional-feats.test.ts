import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

/**
 * The archetypes whose "Additional Feats" were filled last (#1259), each with a feat it lists, by name and the level it
 * gives it. A character holding the dedication takes these as archetype feats (candidate-options.ts).
 */

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const entries: readonly ContentEntry[] = registry.packs.flatMap((pack) => pack.otherEntries);

interface Listed {
  readonly archetype: string;
  readonly pack: string;
  readonly feat: string;
  readonly level: number;
}

const LISTED: readonly Listed[] = [
  { archetype: 'Rivethun Involutionist', pack: 'divine-mysteries', feat: 'Mature Animal Companion (Druid)', level: 6 },
  { archetype: 'Rivethun Involutionist', pack: 'divine-mysteries', feat: 'Incredible Companion (Ranger)', level: 8 },
  { archetype: 'Wylderheart', pack: 'shining-kingdoms', feat: 'Specialized Companion (Druid)', level: 16 },
  { archetype: 'Wild Mimic', pack: 'howl-of-the-wild', feat: 'Gorilla Stance', level: 4 },
  { archetype: 'Wild Mimic', pack: 'howl-of-the-wild', feat: 'Gorilla Pound', level: 8 },
  { archetype: 'Venture-Gossip', pack: 'foolish-housekeeping', feat: 'Quick Change', level: 7 },
  { archetype: 'Ulfen Guard', pack: 'shining-kingdoms', feat: "Guardian's Deflection (Fighter)", level: 8 },
  { archetype: 'Shadowcaster', pack: 'secrets-of-magic', feat: 'Shadow Magic', level: 12 },
  { archetype: 'Shadowcaster', pack: 'secrets-of-magic', feat: 'Additional Shadow Magic', level: 14 },
  { archetype: 'Shadowcaster', pack: 'secrets-of-magic', feat: 'Shadow Illusion', level: 14 },
  { archetype: 'Shadowcaster', pack: 'secrets-of-magic', feat: 'Shadow Power', level: 16 },
  { archetype: 'Archer', pack: 'player-core-2', feat: 'Point Blank Stance', level: 4 },
  { archetype: 'Bastion', pack: 'player-core-2', feat: 'Shield Warden', level: 8 },
  { archetype: 'Dual-Weapon Warrior', pack: 'player-core-2', feat: 'Improved Twin Riposte (Fighter)', level: 16 },
  { archetype: 'Dual-Weapon Warrior', pack: 'player-core-2', feat: 'Twinned Defense (Fighter)', level: 18 },
  { archetype: 'Duelist', pack: 'player-core-2', feat: 'Dueling Dance (Fighter)', level: 14 },
  { archetype: 'Martial Artist', pack: 'player-core-2', feat: 'Brawling Focus', level: 4 },
  { archetype: 'Martial Artist', pack: 'player-core-2', feat: 'Gorilla Stance', level: 4 },
  { archetype: 'Martial Artist', pack: 'player-core-2', feat: 'Gorilla Pound', level: 8 },
  { archetype: 'Beastmaster', pack: 'player-core-2', feat: 'Initiate Warden', level: 4 },
  { archetype: 'Beastmaster', pack: 'player-core-2', feat: 'Side by Side (Ranger)', level: 14 },
  { archetype: 'Chelaxian Scion', pack: 'hells-destiny', feat: 'Point Blank Stance', level: 4 },
  { archetype: 'Chelaxian Scion', pack: 'hells-destiny', feat: 'Knowledge is Power', level: 8 },
  { archetype: 'Chelaxian Scion', pack: 'hells-destiny', feat: 'Knowledge is Power', level: 4 },
];

interface Offered {
  readonly name: string | undefined;
  readonly level: number;
  readonly kind: ContentKind | undefined;
}

/** What `listed`'s archetype offers: each additional feat's name, level and kind, or none when it is not found. */
function additionalFeatsOf({ archetype, pack }: Listed): readonly Offered[] {
  const found = entries.find(
    (entry) => entry.kind === ContentKind.Archetype && entry.name === archetype && String(entry.pack) === pack,
  );
  const additional = found?.kind === ContentKind.Archetype ? (found.data.additionalFeats ?? []) : [];
  return additional.map(({ feat, level }) => {
    const entry = entries.find(({ id }) => id === feat);
    return { name: entry?.name, level, kind: entry?.kind };
  });
}

describe('Additional Feats of the last archetypes', () => {
  test.each(LISTED)('$archetype offers $feat at level $level', (listed) => {
    const offered = additionalFeatsOf(listed).map(({ name, level }) => ({ name, level }));

    expect(offered).toContainEqual({ name: listed.feat, level: listed.level });
  });

  test.each(LISTED)('every additional feat of $archetype is a feat, listed once per level', (listed) => {
    const offered = additionalFeatsOf(listed);
    const pairs = offered.map(({ name, level }) => `${name}@${level}`);

    expect(new Set(pairs).size).toBe(pairs.length);
    expect(offered.every(({ kind }) => kind === ContentKind.Feat)).toBe(true);
  });
});
