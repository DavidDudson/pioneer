import type { BugReport, BugReportDetail, BugReportListItem, BugReportStatus, UserId } from '@pioneer/identity/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { BugReportRepository } from './bug-report-repository';

/** Repository adapter for tests and local experiments. It knows no accounts, so reporters have no name. */
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

  public override async list(limit: number): Promise<BugReportListItem[]> {
    return [...this.#reports.values()]
      .toSorted((left, right) => Temporal.Instant.compare(right.createdAt, left.createdAt))
      .slice(0, limit)
      .map((report) => ({
        id: report.id,
        status: report.status,
        route: report.route,
        description: report.description,
        reporter: report.reporter,
        createdAt: report.createdAt,
        hasSnapshot: report.snapshot !== undefined,
      }));
  }

  public override async findDetail(id: BugReport['id']): Promise<BugReportDetail | undefined> {
    return this.#reports.get(id);
  }

  public override async setStatus(id: BugReport['id'], status: BugReportStatus): Promise<boolean> {
    const report = this.#reports.get(id);
    if (report === undefined) {
      return false;
    }
    this.#reports.set(id, { ...report, status });
    return true;
  }
}
