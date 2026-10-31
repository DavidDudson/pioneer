import type { EnabledPack, PackCandidate, PackTitle, UnsupportedPack } from '@pioneer/character/domain';

import type { CatalogPack } from './character-pack-catalog';

export function byTitle(left: CatalogPack, right: CatalogPack): number {
  return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}

/** A pack the character uses. Only its owner disables one, and not while an enabled pack extends it or a campaign decides. */
export function enabledEntry(pack: CatalogPack, requiredBy: readonly PackTitle[], manageable: boolean): EnabledPack {
  return {
    packId: pack.id,
    title: pack.title,
    publisher: pack.publisher,
    official: pack.official,
    requiredBy,
    removable: manageable && !pack.official && requiredBy.length === 0,
  };
}

/** A pack the character holds content from that is not in force. */
export function unsupportedEntry(pack: CatalogPack): UnsupportedPack {
  return { packId: pack.id, title: pack.title, publisher: pack.publisher, official: pack.official };
}

export function candidateEntry(pack: CatalogPack): PackCandidate {
  return {
    packId: pack.id,
    title: pack.title,
    publisher: pack.publisher,
    official: pack.official,
    private: pack.private,
  };
}
