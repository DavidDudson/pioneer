import type { CharacterSnapshot, UserId } from '@pioneer/identity/domain';
import type { Uuid } from '@pioneer/shared/kernel';

/**
 * Port to the character a bug report may carry. Identity may not import the character context, so
 * the composition root wires an adapter over it.
 */
export abstract class CharacterSnapshotSource {
  /**
   * A frozen copy of `actor`'s character `id`, or `undefined` when there is none to take: the
   * character is gone, belongs to someone else, or can't be exported. Never throws for those, so
   * they can't block a report.
   */
  public abstract take(actor: UserId, id: Uuid): Promise<CharacterSnapshot | undefined>;
}
