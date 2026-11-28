import type { ContentEntry, ContentId, ContentPackId } from '@pioneer/rules/sdk';

import { HomebrewEntryRepository } from './homebrew-entry-repository';
import type { EntryRef, EntryWrite, StoredHomebrewEntry } from './homebrew-entry-repository';

/** Entry repository adapter for tests and local experiments. */
export class InMemoryHomebrewEntryRepository extends HomebrewEntryRepository {
  readonly #rows = new Map<ContentId, { pack: ContentPackId; stored: StoredHomebrewEntry }>();
  readonly #writes: Array<EntryWrite> = [];

  /** What each write was stamped with, in order. */
  public get writes(): ReadonlyArray<EntryWrite> {
    return this.#writes;
  }

  public override async list(pack: ContentPackId, archived: boolean): Promise<ReadonlyArray<StoredHomebrewEntry>> {
    return [...this.#rows.values()]
      .flatMap((row) => (row.pack === pack && (row.stored.archivedAt !== undefined) === archived ? [row.stored] : []))
      .toSorted((left, right) => left.entry.slug.localeCompare(right.entry.slug));
  }

  public override async find({ pack, id }: EntryRef): Promise<StoredHomebrewEntry | undefined> {
    const row = this.#rows.get(id);

    return row?.pack === pack ? row.stored : undefined;
  }

  public override async insert(pack: ContentPackId, entry: ContentEntry, write: EntryWrite): Promise<boolean> {
    const taken = [...this.#rows.values()].some((row) => row.pack === pack && row.stored.entry.slug === entry.slug);

    if (taken) {
      return false;
    }

    this.#rows.set(entry.id, { pack, stored: { entry, updatedAt: write.now } });
    this.#writes.push(write);

    return true;
  }

  public override async replace(pack: ContentPackId, entry: ContentEntry, write: EntryWrite): Promise<boolean> {
    const row = this.#rows.get(entry.id);

    if (row?.pack !== pack || row.stored.archivedAt !== undefined) {
      return false;
    }

    this.#rows.set(entry.id, { pack, stored: { entry, updatedAt: write.now } });
    this.#writes.push(write);

    return true;
  }

  public override async setArchived({ pack, id }: EntryRef, archived: boolean, write: EntryWrite): Promise<boolean> {
    const row = this.#rows.get(id);

    if (row?.pack !== pack) {
      return false;
    }

    if ((row.stored.archivedAt !== undefined) !== archived) {
      const { archivedAt: _was, ...live } = row.stored;
      this.#rows.set(id, { pack, stored: archived ? { ...live, archivedAt: write.now } : live });
      this.#writes.push(write);
    }

    return true;
  }
}
