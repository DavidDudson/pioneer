import { heldContentIds } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';

import type { CharacterPackCatalog } from './character-pack-catalog';
import type { PackLookup } from './pack-lookup';

/**
 * The homebrew packs a character holds content from: what its document refers to that a pack defines. A campaign may
 * disable such a pack, so this is wider than the packs in force; the difference is the content that is no longer
 * supported (ADR-0060). A pack the owner may no longer read is left out, as it is for the packs in force.
 */
export class HeldContentPacks {
  readonly #lookup: PackLookup;
  readonly #catalog: CharacterPackCatalog;

  public constructor(lookup: PackLookup, catalog: CharacterPackCatalog) {
    this.#lookup = lookup;
    this.#catalog = catalog;
  }

  public async of(character: Character): Promise<readonly ContentPackId[]> {
    const packs = await this.#lookup.packsOf(heldContentIds(character.document));
    if (packs.length === 0) {
      return [];
    }
    const catalog = await this.#catalog.readableBy(character.ownerId);
    const readable = new Set(catalog.map((pack) => pack.id));
    return packs.filter((pack) => readable.has(pack));
  }
}
