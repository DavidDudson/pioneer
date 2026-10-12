import type { CharacterId, SheetMode } from '@pioneer/character/domain';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

/** Whose tab on which character's sheet. */
export interface SheetModeKey {
  readonly userId: UserId;
  readonly characterId: CharacterId;
}

/**
 * Port for the tab each user last had open on each character's sheet (ADR-0050). A user who never switched tabs on a
 * character has none stored. Adapters live in `character-infrastructure`; `InMemorySheetModeRepository` is for tests.
 */
export abstract class SheetModeRepository {
  public abstract findFor(key: SheetModeKey): Promise<SheetMode | undefined>;

  /** Stores `mode` as the user's tab on the character, replacing any earlier one. */
  public abstract save(key: SheetModeKey, mode: SheetMode, now: Temporal.Instant): Promise<void>;
}
