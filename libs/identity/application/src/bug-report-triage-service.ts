import { BUG_REPORT_LIST_LIMIT } from '@pioneer/identity/domain';
import type { BugReportDetail, BugReportListItem, BugReportStatus, UserId } from '@pioneer/identity/domain';
import { NotFoundError } from '@pioneer/shared/kernel';

import type { BugReportRepository } from './bug-report-repository';
import type { UserRepository } from './user-repository';

const RESOURCE = 'BugReport';

/**
 * The maintainers' view of bug reports: the list, one report in full, and where each stands. Everything here is for
 * maintainers only, and to anyone else it does not exist: a refusal is a not found, like another user's character, so
 * the endpoints reveal nothing to a member.
 */
export class BugReportTriageService {
  readonly #reports: BugReportRepository;
  readonly #users: UserRepository;

  public constructor(reports: BugReportRepository, users: UserRepository) {
    this.#reports = reports;
    this.#users = users;
  }

  /** The newest reports, newest first. */
  public async list(actor: UserId): Promise<BugReportListItem[]> {
    await this.#requireMaintainer(actor);
    return this.#reports.list(BUG_REPORT_LIST_LIMIT);
  }

  /** One report with the snapshot the reporter shared, if any. */
  public async read(actor: UserId, id: BugReportDetail['id']): Promise<BugReportDetail> {
    await this.#requireMaintainer(actor);
    return this.#found(id);
  }

  /** Sets where a report stands (open, confirmed, fixed or declined), and answers with the report. */
  public async setStatus(actor: UserId, id: BugReportDetail['id'], status: BugReportStatus): Promise<BugReportDetail> {
    await this.#requireMaintainer(actor);
    const changed = await this.#reports.setStatus(id, status);
    if (!changed) {
      throw new NotFoundError(RESOURCE, id);
    }
    return this.#found(id);
  }

  async #requireMaintainer(actor: UserId): Promise<void> {
    const user = await this.#users.findById(actor);
    if (user?.isMaintainer !== true) {
      throw new NotFoundError(RESOURCE, actor);
    }
  }

  async #found(id: BugReportDetail['id']): Promise<BugReportDetail> {
    const report = await this.#reports.findDetail(id);
    if (report === undefined) {
      throw new NotFoundError(RESOURCE, id);
    }
    return report;
  }
}
