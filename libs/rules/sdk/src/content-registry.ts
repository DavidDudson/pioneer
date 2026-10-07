import { AncestryId } from './ancestry';
import type { AncestryDefinition } from './ancestry';
import { ContentEntry } from './content-entry';
import type { ContentPack, ContentPackLoader } from './content-pack';
import { CreatureId } from './creature';
import type { CreatureDefinition } from './creature';

export type AncestryEntry = ContentEntry<AncestryId, AncestryDefinition>;
export type CreatureEntry = ContentEntry<CreatureId, CreatureDefinition>;

/**
 * Everything loaded from content packs, indexed by id. Server and client each
 * hold one; packs are added with `load` (lazy) or `register` (already loaded).
 */
export class ContentRegistry {
  readonly #packs = new Map<string, ContentPack>();
  readonly #ancestries = new Map<string, AncestryEntry>();
  readonly #creatures = new Map<string, CreatureEntry>();

  public async load(loader: ContentPackLoader): Promise<ContentPack> {
    const existing = this.#packs.get(loader.id);
    if (existing !== undefined) {
      return existing;
    }
    const pack = await loader.load();
    if (pack.id !== loader.id) {
      throw new Error(`Loader "${loader.id}" returned pack "${pack.id}"`);
    }
    this.register(pack);
    return pack;
  }

  public register(pack: ContentPack): void {
    if (this.#packs.has(pack.id)) {
      throw new Error(`Content pack "${pack.id}" is already registered`);
    }
    this.#packs.set(pack.id, pack);
    for (const definition of pack.ancestries) {
      const entry: AncestryEntry = new ContentEntry(pack, definition, AncestryId);
      this.#ancestries.set(entry.id, entry);
    }
    for (const definition of pack.creatures) {
      const entry: CreatureEntry = new ContentEntry(pack, definition, CreatureId);
      this.#creatures.set(entry.id, entry);
    }
  }

  public get packs(): readonly ContentPack[] {
    return [...this.#packs.values()];
  }

  public ancestries(): readonly AncestryEntry[] {
    return [...this.#ancestries.values()];
  }

  public ancestry(id: AncestryId): AncestryEntry | undefined {
    return this.#ancestries.get(id);
  }

  public creatures(): readonly CreatureEntry[] {
    return [...this.#creatures.values()];
  }

  public creature(id: CreatureId): CreatureEntry | undefined {
    return this.#creatures.get(id);
  }
}
