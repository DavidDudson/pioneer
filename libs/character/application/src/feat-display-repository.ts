import type { CharacterId, FeatDisplaySection } from '@pioneer/character/domain';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

/** Whose filter on which character's sheet. */
export interface FeatDisplayKey {
  readonly userId: UserId;
  readonly characterId: CharacterId;
}

/** One section's filter and the section it is for. */
export interface FeatDisplaySetting {
  readonly section: FeatDisplaySection;
  readonly showGrantOnly: boolean;
}

/**
 * Port for the sections where each user shows each character's grant-only feats (ADR-0052). A user who never chose
 * has none stored. Adapters live in `character-infrastructure`; `InMemoryFeatDisplayRepository` is for tests.
 */
export abstract class FeatDisplayRepository {
  /** The sections where the user shows the character's grant-only feats. */
  public abstract findShown(key: FeatDisplayKey): Promise<readonly FeatDisplaySection[]>;

  /** Stores `setting` as the user's filter on the character, replacing any earlier one for its section. */
  public abstract save(key: FeatDisplayKey, setting: FeatDisplaySetting, now: Temporal.Instant): Promise<void>;
}
