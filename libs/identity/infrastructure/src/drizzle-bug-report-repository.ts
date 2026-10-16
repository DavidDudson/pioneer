import { BugReportRepository } from '@pioneer/identity/application';
import type { BugReport, BugReportDetail, BugReportListItem, BugReportStatus, UserId } from '@pioneer/identity/domain';
import { Temporal } from '@pioneer/shared/kernel';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { bugReports, users } from './identity.table';

type BugReportRow = typeof bugReports.$inferSelect;

function toBugReport(row: BugReportRow): BugReport {
  return {
    id: row.id,
    reporter: row.reporter,
    createdAt: Temporal.Instant.from(row.createdAt),
    route: row.route,
    appVersion: row.appVersion,
    locale: row.locale,
    userAgent: row.userAgent,
    description: row.description,
    steps: row.steps,
    characterId: row.characterId ?? undefined,
    snapshot: row.snapshot ?? undefined,
    status: row.status,
  };
}

export class DrizzleBugReportRepository extends BugReportRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async insert(report: BugReport): Promise<void> {
    await this.#db.insert(bugReports).values({ ...report, createdAt: report.createdAt.toString() });
  }

  public override async findById(id: BugReport['id']): Promise<BugReport | undefined> {
    const [row] = await this.#db.select().from(bugReports).where(eq(bugReports.id, id)).limit(1);
    return row === undefined ? undefined : toBugReport(row);
  }

  public override async countSince(reporter: UserId, since: Temporal.Instant): Promise<number> {
    const sinceText = since.toString();
    const recent = and(eq(bugReports.reporter, reporter), gte(bugReports.createdAt, sinceText));
    const [row] = await this.#db.select({ total: count() }).from(bugReports).where(recent);
    return row?.total ?? 0;
  }

  public override async list(limit: number): Promise<BugReportListItem[]> {
    const rows = await this.#db
      .select({ report: bugReports, reporterName: users.displayName })
      .from(bugReports)
      .leftJoin(users, eq(users.id, bugReports.reporter))
      .orderBy(desc(bugReports.createdAt))
      .limit(limit);
    return rows.map(({ report, reporterName }) => ({
      id: report.id,
      status: report.status,
      route: report.route,
      description: report.description,
      reporter: report.reporter,
      reporterName: reporterName ?? undefined,
      createdAt: Temporal.Instant.from(report.createdAt),
      hasSnapshot: report.snapshot !== null,
    }));
  }

  public override async findDetail(id: BugReport['id']): Promise<BugReportDetail | undefined> {
    const [row] = await this.#db
      .select({ report: bugReports, reporterName: users.displayName })
      .from(bugReports)
      .leftJoin(users, eq(users.id, bugReports.reporter))
      .where(eq(bugReports.id, id))
      .limit(1);
    return row === undefined ? undefined : { ...toBugReport(row.report), reporterName: row.reporterName ?? undefined };
  }

  public override async setStatus(id: BugReport['id'], status: BugReportStatus): Promise<boolean> {
    const changed = await this.#db
      .update(bugReports)
      .set({ status })
      .where(eq(bugReports.id, id))
      .returning({ id: bugReports.id });
    return changed.length > 0;
  }
}
