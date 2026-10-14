import type { EmbeddedPack, ExistingPack, ExistingPacks, HomebrewPackPlan } from '@pioneer/interop/pioneer';
import type { ContentEntry, ContentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

import { EmbeddedHomebrew } from './embedded-homebrew';

interface StoredPack {
  readonly pack: EmbeddedPack['pack'];
  readonly ownerId: UserId;
  readonly entries: Map<EntrySlug, ContentEntry>;
}

/** An in-memory `EmbeddedHomebrew` for tests. Every pack is readable by everyone, as a public one is. */
export class InMemoryEmbeddedHomebrew extends EmbeddedHomebrew {
  readonly #packs = new Map<PackId, StoredPack>();

  /** A pack owned by `ownerId`, holding `embedded`'s entries. */
  public seed(ownerId: UserId, embedded: EmbeddedPack): void {
    this.#packs.set(embedded.pack.id, {
      pack: embedded.pack,
      ownerId,
      entries: new Map(embedded.entries.map((entry) => [entry.slug, entry])),
    });
  }

  /** The entries a pack holds, by slug; empty when there is no such pack. */
  public entriesOf(pack: PackId): readonly ContentEntry[] {
    return [...(this.#packs.get(pack)?.entries.values() ?? [])];
  }

  public override async holding(_actor: UserId, ids: readonly ContentId[]): Promise<readonly EmbeddedPack[]> {
    const wanted = new Set(ids);
    return [...this.#packs.values()].flatMap(({ pack, entries }) => {
      const held = [...entries.values()].filter((entry) => wanted.has(entry.id));
      return held.length === 0 ? [] : [{ pack, entries: held }];
    });
  }

  public override async existing(actor: UserId, packs: readonly PackId[]): Promise<ExistingPacks> {
    return new Map(
      packs.flatMap((id): [PackId, ExistingPack][] => {
        const stored = this.#packs.get(id);
        return stored === undefined
          ? []
          : [[id, { ownedByImporter: stored.ownerId === actor, entries: stored.entries }]];
      }),
    );
  }

  public override async apply(actor: UserId, plans: readonly HomebrewPackPlan[]): Promise<void> {
    for (const { embedded, toCreate } of plans) {
      const stored = this.#packs.get(embedded.pack.id) ?? { pack: embedded.pack, ownerId: actor, entries: new Map() };
      if (stored.ownerId === actor) {
        for (const entry of toCreate) {
          stored.entries.set(entry.slug, entry);
        }
        this.#packs.set(embedded.pack.id, stored);
      }
    }
  }
}
