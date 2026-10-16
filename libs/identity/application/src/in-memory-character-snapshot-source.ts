import type { CharacterSnapshot, UserId } from '@pioneer/identity/domain';
import type { Uuid } from '@pioneer/shared/kernel';

import { CharacterSnapshotSource } from './character-snapshot-source';

/** Snapshot source for tests: characters are put in by owner and id, and read back as copies. */
export class InMemoryCharacterSnapshotSource extends CharacterSnapshotSource {
  readonly #snapshots = new Map<string, CharacterSnapshot>();

  /** Makes `id` a character of `owner` with this document. */
  public put(owner: UserId, id: Uuid, snapshot: CharacterSnapshot): void {
    this.#snapshots.set(`${owner}/${id}`, snapshot);
  }

  public override async take(actor: UserId, id: Uuid): Promise<CharacterSnapshot | undefined> {
    const found = this.#snapshots.get(`${actor}/${id}`);
    return found === undefined ? undefined : structuredClone(found);
  }
}
