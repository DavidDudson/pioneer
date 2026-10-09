import type { Preferences, UserId } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';

/**
 * Port for each user's display preferences. A user who never chose any has none stored, which
 * reads as `NO_PREFERENCES`. Adapters live in `identity-infrastructure`; `InMemoryPreferencesRepository`
 * is for tests.
 */
export abstract class PreferencesRepository {
  public abstract findFor(userId: UserId): Promise<Preferences>;

  /** Applies the fields `patch` gives, leaving the rest, and returns the result. */
  public abstract update(userId: UserId, patch: Preferences, now: Temporal.Instant): Promise<Preferences>;
}
