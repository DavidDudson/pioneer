import { officialPacks } from '@pioneer/rules/catalog';
import type { ContentKind, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';

/** Player Core's kinds the character pages read in specs; items come from the item fixtures instead. */
const KEPT: ReadonlySet<ContentKind> = new Set(CHARACTER_CONTENT_KINDS);

/** `pack` with only `KEPT` kinds, read once like the pack it cuts down. */
function cutDown(pack: PackContentsLoader): PackContentsLoader {
  let contents: Promise<PackContents> | undefined = undefined;
  const cut = async (): Promise<PackContents> => {
    const full = await pack.load();
    return { ...full, entries: full.entries.filter(({ kind }) => KEPT.has(kind)) };
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
export const TEST_PACKS: readonly PackContentsLoader[] = officialPacks.map((pack) =>
  pack.id === 'player-core' ? cutDown(pack) : pack,
);
