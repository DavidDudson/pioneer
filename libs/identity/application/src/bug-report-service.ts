import { BugReportId, BugReportStatus } from '@pioneer/identity/domain';
import type { BugReport, BugReportReceipt, BugReportSubmission, UserId } from '@pioneer/identity/domain';
import { newId, RateLimitedError, Temporal } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';

import type { BugReportRepository } from './bug-report-repository';
import type { CharacterSnapshotSource } from './character-snapshot-source';

/** The most reports one user may file in `BUG_REPORT_WINDOW`. */
export const BUG_REPORT_LIMIT = 5;

/** The span the limit counts over, ending now. */
export const BUG_REPORT_WINDOW: Temporal.Duration = Temporal.Duration.from({
  hours: 1,
});

/**
 * Files bug reports for the acting user. The reporter and the time are stamped here, never taken
 * from the request.
 */
export class BugReportService {
  readonly #reports: BugReportRepository;
  readonly #characters: CharacterSnapshotSource;
  readonly #clock: Clock;

  public constructor(reports: BugReportRepository, characters: CharacterSnapshotSource, clock: Clock) {
    this.#reports = reports;
    this.#characters = characters;
    this.#clock = clock;
  }

  /**
   * Stores the report, or refuses with a `RateLimitedError` once the user has filed
   * `BUG_REPORT_LIMIT` in the last `BUG_REPORT_WINDOW`. Two reports racing at the limit can both
   * pass; that overshoots by at most the number of concurrent requests, which is harmless here.
   *
   * With `shareCharacter` and a `characterId`, the character is read here, from storage, as the
   * actor's own, and its frozen copy is stored with the report; the client never sends a document.
   * A character that can't be copied does not hold the report back: it is filed without one, and
   * the receipt says `snapshotTaken: false`.
   */
  public async submit(actor: UserId, submission: BugReportSubmission): Promise<BugReportReceipt> {
    const now = this.#clock.now();
    const recent = await this.#reports.countSince(actor, now.subtract(BUG_REPORT_WINDOW));
    if (recent >= BUG_REPORT_LIMIT) {
      throw new RateLimitedError(`User ${actor} filed ${recent} bug reports in the last hour`);
    }
    const { shareCharacter, ...details } = submission;
    const snapshot =
      shareCharacter && details.characterId !== undefined
        ? await this.#characters.take(actor, details.characterId)
        : undefined;
    const filed = {
      ...details,
      id: BugReportId.parse(newId()),
      reporter: actor,
      createdAt: now,
      status: BugReportStatus.Open,
    };
    const report: BugReport = { ...filed, snapshot };
    await this.#reports.insert(report);
    return { ...filed, snapshotTaken: snapshot !== undefined };
  }
}
