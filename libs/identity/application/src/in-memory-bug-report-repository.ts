import type { BugReport, UserId } from '@pioneer/identity/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { BugReportRepository } from './bug-report-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryBugReportRepository extends BugReportRepository {
  readonly #reports = new Map<BugReport['id'], BugReport>();

  public override async insert(report: BugReport): Promise<void> {
    this.#reports.set(report.id, report);
  }

  public override async findById(id: BugReport['id']): Promise<BugReport | undefined> {
    return this.#reports.get(id);
  }

  public override async countSince(reporter: UserId, since: Temporal.Instant): Promise<number> {
    return [...this.#reports.values()].filter(
      (report) => report.reporter === reporter && Temporal.Instant.compare(report.createdAt, since) >= 0,
    ).length;
  }
}
