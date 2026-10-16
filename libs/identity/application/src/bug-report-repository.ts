import type { BugReport, BugReportDetail, BugReportListItem, BugReportStatus, UserId } from '@pioneer/identity/domain';
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

  /** The newest `limit` reports, newest first, with their reporters' current names. */
  public abstract list(limit: number): Promise<BugReportListItem[]>;

  /** One report with its snapshot and its reporter's current name. */
  public abstract findDetail(id: BugReport['id']): Promise<BugReportDetail | undefined>;

  /** Sets where a report stands; false when there is no such report. */
  public abstract setStatus(id: BugReport['id'], status: BugReportStatus): Promise<boolean>;
}
