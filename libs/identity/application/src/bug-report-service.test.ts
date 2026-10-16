import { describe, expect, test } from 'bun:test';

import { BugReportId, BugReportStatus, BugReportSubmission, UserId } from '@pioneer/identity/domain';
import type { BugReport } from '@pioneer/identity/domain';
import { fixedClock, Temporal, newId, RateLimitedError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { BUG_REPORT_LIMIT, BugReportService } from './bug-report-service';
import { InMemoryBugReportRepository } from './in-memory-bug-report-repository';

const NOW = '2026-10-15T08:00:00Z';

const SUBMISSION = BugReportSubmission.parse({
  route: '/characters/amiri',
  appVersion: '1.2.3',
  locale: 'en',
  userAgent: 'Mozilla/5.0',
  description: 'The AC is wrong',
  steps: 'Open the sheet',
});

interface Fixture {
  readonly reports: BugReportService;
  readonly repository: InMemoryBugReportRepository;
}

function fixture(): Fixture {
  const repository = new InMemoryBugReportRepository();
  return { reports: new BugReportService(repository, fixedClock(NOW)), repository };
}

/** `count` reports `reporter` filed at `at`, put straight into the repository. */
interface Seeding {
  readonly repository: InMemoryBugReportRepository;
  readonly reporter: UserId;
  readonly count: number;
  readonly at: Temporal.Instant;
}

async function seed({ repository, reporter, count, at }: Seeding): Promise<void> {
  const stored: BugReport[] = Array.from({ length: count }, () => ({
    ...SUBMISSION,
    id: BugReportId.parse(newId()),
    reporter,
    createdAt: at,
    status: BugReportStatus.Open,
  }));
  await Promise.all(stored.map(async (report) => repository.insert(report)));
}

describe('BugReportService', () => {
  test('stores an open report stamped with the reporter and the time', async () => {
    const { reports, repository } = fixture();
    const amiri = UserId.parse(newId());
    const report = await reports.submit(amiri, SUBMISSION);
    expect(report).toMatchObject({ ...SUBMISSION, reporter: amiri, status: BugReportStatus.Open });
    expect(report.createdAt.toString()).toBe(NOW);
    const stored = await repository.findById(report.id);
    expect(stored).toStrictEqual(report);
  });

  test('keeps the character the reporter was looking at', async () => {
    const characterId = newId();
    const report = await fixture().reports.submit(UserId.parse(newId()), { ...SUBMISSION, characterId });
    expect(report.characterId).toBe(characterId);
  });

  test('refuses a report past the hourly limit', async () => {
    const { reports, repository } = fixture();
    const amiri = UserId.parse(newId());
    await seed({ repository, reporter: amiri, count: BUG_REPORT_LIMIT, at: Temporal.Instant.from(NOW) });
    expect(await rejection(reports.submit(amiri, SUBMISSION))).toBeInstanceOf(RateLimitedError);
  });

  test('reports older than the window stop counting', async () => {
    const { reports, repository } = fixture();
    const amiri = UserId.parse(newId());
    const earlier = Temporal.Instant.from(NOW).subtract({ hours: 2 });
    await seed({ repository, reporter: amiri, count: BUG_REPORT_LIMIT, at: earlier });
    const report = await reports.submit(amiri, SUBMISSION);
    expect(report.status).toBe(BugReportStatus.Open);
  });

  test("one user's reports never count against another", async () => {
    const { reports, repository } = fixture();
    await seed({
      repository,
      reporter: UserId.parse(newId()),
      count: BUG_REPORT_LIMIT,
      at: Temporal.Instant.from(NOW),
    });
    const report = await reports.submit(UserId.parse(newId()), SUBMISSION);
    expect(report.status).toBe(BugReportStatus.Open);
  });
});
