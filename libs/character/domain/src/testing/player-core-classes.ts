import {
  ContentEntry,
  ContentId,
  ContentKind,
  ContentLicense,
  ContentPack,
  contentId,
  EntrySlug,
  PackId,
} from '@pioneer/rules/sdk';

import entries from './player-core-classes.json';

/**
 * Player Core's eight classes as the importer translates them from `pf2e-8.6.0` (`content/import/player-core.json`):
 * each class with its starting ranks, every rule element the import translates, and the class features it grants at
 * 1st level; each subclass feature with the Player Core options its tag query offers. Descriptions are left out, and
 * every source is page 1 of Player Core, a placeholder the import tests' `contentEntry` gives to pass the source check:
 * test data only, never a pack's source. Regenerate it with the importer rather than editing it by hand, until the
 * Player Core pack itself lands (#401).
 */
export const PLAYER_CORE_CLASS_PACK = PackId.parse('player-core');

/** Bard, cleric, druid, fighter, ranger, rogue, witch and wizard. */
export type PlayerCoreClass = 'bard' | 'cleric' | 'druid' | 'fighter' | 'ranger' | 'rogue' | 'witch' | 'wizard';
export const PLAYER_CORE_CLASSES: readonly PlayerCoreClass[] = [
  'bard',
  'cleric',
  'druid',
  'fighter',
  'ranger',
  'rogue',
  'witch',
  'wizard',
];

const ALL = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

/** Player Core's human, the ancestry `CharacterBuilder` gives a character unless told otherwise. */
const HUMAN = {
  slug: 'ancestry:human',
  name: 'Human',
  hitPoints: 8,
  size: 'medium',
  speed: 25,
  traits: ['human', 'humanoid'],
  boosts: [ALL, ALL],
  flaws: [],
  sources: [{ kind: 'book', book: 'player-core', page: 62 }],
} as const;

/** The pack: Player Core's human, and the classes with their 1st-level class features. */
export function playerCoreClasses(): ContentPack {
  return ContentPack.define({
    manifest: {
      id: PLAYER_CORE_CLASS_PACK,
      title: 'Player Core classes (test)',
      publisher: 'Paizo',
      license: ContentLicense.Orc,
    },
    ancestries: [HUMAN],
    creatures: [],
    statistics: [],
    rollOptionNamespaces: {},
    otherEntries: entries,
  });
}

/** The id of the pack's entry of `kind` named `name` (`class`, `cleric`). */
export function playerCoreId(kind: ContentKind, name: string): ContentId {
  return ContentId.parse(contentId(PLAYER_CORE_CLASS_PACK, EntrySlug.parse(`${kind}:${name}`)));
}

/** The id of a Player Core class. */
export function playerCoreClassId(name: PlayerCoreClass): ContentId {
  return playerCoreId(ContentKind.Class, name);
}

/** The classes and their 1st-level class features as entries, to add to a Player Core pack that lacks them. */
export function playerCoreClassEntries(): readonly ContentEntry[] {
  return entries.map((entry) => ContentEntry.parse(entry));
}
