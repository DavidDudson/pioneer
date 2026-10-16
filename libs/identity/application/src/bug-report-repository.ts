import type { BugReport, UserId } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';

/**
 * Port for stored bug reports. Adapters live in `identity-infrastructure`;
 * `InMemoryBugReportRepository` is for tests.
 */
export abstract class BugReportRepository {
  public abstract insert(report: BugReport): Promise<void>;

  public abstract findById(id: BugReport['id']): Promise<BugReport | undefined>;

  /** How many reports `reporter` has filed at or after `since`. */
  public abstract countSince(reporter: UserId, since: Temporal.Instant): Promise<number>;
}
