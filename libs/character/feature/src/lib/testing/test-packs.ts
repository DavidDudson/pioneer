import { officialPacks } from '@pioneer/rules/catalog';
import type { ContentKind, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';

/** `pack` with only the `kept` kinds, read once like the pack it cuts down. */
function cutDown(pack: PackContentsLoader, kept: ReadonlySet<ContentKind>): PackContentsLoader {
  let contents: Promise<PackContents> | undefined = undefined;
  const cut = async (): Promise<PackContents> => {
    const full = await pack.load();
    return { ...full, entries: full.entries.filter(({ kind }) => kept.has(kind)) };
  };
  return {
    id: pack.id,
    load: async () => {
      contents ??= cut();
      return contents;
    },
  };
}

/**
 * The official packs as the character specs read them: Player Core cut down to its ancestries, heritages,
 * backgrounds, classes and class features, so a page under test does not parse its feats, spells and items. Cut
 * from the committed pack at load, so it never drifts from it. A spec that needs all of Player Core (matching an
 * export's names) passes `officialPacks` instead.
 */
export const TEST_PACKS: readonly PackContentsLoader[] = cutTo(CHARACTER_CONTENT_KINDS);

/** The official packs with Player Core cut down to `kinds`: the character kinds and the spells, for the spell pickers. */
export function cutTo(kinds: readonly ContentKind[]): readonly PackContentsLoader[] {
  const kept = new Set(kinds);
  return officialPacks.map((pack) => (pack.id === 'player-core' ? cutDown(pack, kept) : pack));
}
