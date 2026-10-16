import { describe, expect, test } from 'bun:test';

import { BugReportId, BugReportStatus, BugReportSubmission, UserId } from '@pioneer/identity/domain';
import type { BugReport } from '@pioneer/identity/domain';
import { fixedClock, Temporal, newId, RateLimitedError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { BUG_REPORT_LIMIT, BugReportService } from './bug-report-service';
import { InMemoryBugReportRepository } from './in-memory-bug-report-repository';
import { InMemoryCharacterSnapshotSource } from './in-memory-character-snapshot-source';

const NOW = '2026-10-15T08:00:00Z';

/** A submission without the sharing flag, which is not part of what is stored. */
function details(submission: BugReportSubmission): Omit<BugReportSubmission, 'shareCharacter'> {
  const { shareCharacter: _ignored, ...rest } = submission;
  return rest;
}

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
  readonly characters: InMemoryCharacterSnapshotSource;
}

function fixture(): Fixture {
  const repository = new InMemoryBugReportRepository();
  const characters = new InMemoryCharacterSnapshotSource();
  return {
    reports: new BugReportService(repository, characters, fixedClock(NOW)),
    repository,
    characters,
  };
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

/** The snapshot stored with a report, if it has one. */
async function storedSnapshot(
  repository: InMemoryBugReportRepository,
  id: BugReport['id'],
): Promise<BugReport['snapshot']> {
  const stored = await repository.findById(id);
  return stored?.snapshot;
}

describe('BugReportService', () => {
  test('stores an open report stamped with the reporter and the time', async () => {
    const { reports, repository } = fixture();
    const amiri = UserId.parse(newId());
    const report = await reports.submit(amiri, SUBMISSION);
    expect(report).toMatchObject({
      ...details(SUBMISSION),
      reporter: amiri,
      status: BugReportStatus.Open,
    });
    expect(report.createdAt.toString()).toBe(NOW);
    const stored = await repository.findById(report.id);
    expect(stored).toMatchObject({
      ...details(SUBMISSION),
      id: report.id,
      reporter: amiri,
      createdAt: report.createdAt,
    });
  });

  test('keeps the character the reporter was looking at', async () => {
    const characterId = newId();
    const report = await fixture().reports.submit(UserId.parse(newId()), {
      ...SUBMISSION,
      characterId,
    });
    expect(report.characterId).toBe(characterId);
  });

  test('refuses a report past the hourly limit', async () => {
    const { reports, repository } = fixture();
    const amiri = UserId.parse(newId());
    await seed({
      repository,
      reporter: amiri,
      count: BUG_REPORT_LIMIT,
      at: Temporal.Instant.from(NOW),
    });
    expect(await rejection(reports.submit(amiri, SUBMISSION))).toBeInstanceOf(RateLimitedError);
  });

  test('reports older than the window stop counting', async () => {
    const { reports, repository } = fixture();
    const amiri = UserId.parse(newId());
    const earlier = Temporal.Instant.from(NOW).subtract({ hours: 2 });
    await seed({
      repository,
      reporter: amiri,
      count: BUG_REPORT_LIMIT,
      at: earlier,
    });
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

describe('BugReportService character snapshot', () => {
  const characterId = newId();
  const FILE = {
    format: 'pioneer-character',
    formatVersion: 1,
    character: { name: 'Amiri', level: 3 },
  };

  function shared(overrides: Partial<BugReportSubmission> = {}): BugReportSubmission {
    return { ...SUBMISSION, characterId, shareCharacter: true, ...overrides };
  }

  test("stores a copy of the reporter's character when they share it", async () => {
    const { reports, repository, characters } = fixture();
    const amiri = UserId.parse(newId());
    characters.put(amiri, characterId, FILE);
    const receipt = await reports.submit(amiri, shared());
    expect(receipt.snapshotTaken).toBe(true);
    expect(receipt).not.toHaveProperty('snapshot');
    expect(await storedSnapshot(repository, receipt.id)).toStrictEqual(FILE);
  });

  test('stores none when the reporter unticks sharing', async () => {
    const { reports, repository, characters } = fixture();
    const amiri = UserId.parse(newId());
    characters.put(amiri, characterId, FILE);
    const receipt = await reports.submit(amiri, shared({ shareCharacter: false }));
    expect(receipt.snapshotTaken).toBe(false);
    expect(await storedSnapshot(repository, receipt.id)).toBeUndefined();
  });

  test('stores none when no character was attached', async () => {
    const receipt = await fixture().reports.submit(UserId.parse(newId()), shared({ characterId: undefined }));
    expect(receipt.snapshotTaken).toBe(false);
  });

  test("files the report without a snapshot when the character is gone or isn't theirs", async () => {
    const { reports, repository, characters } = fixture();
    characters.put(UserId.parse(newId()), characterId, FILE);
    const receipt = await reports.submit(UserId.parse(newId()), shared());
    expect(receipt.snapshotTaken).toBe(false);
    expect(await storedSnapshot(repository, receipt.id)).toBeUndefined();
  });

  test('a snapshot is a copy: later edits to the source never reach it', async () => {
    const { reports, repository, characters } = fixture();
    const amiri = UserId.parse(newId());
    characters.put(amiri, characterId, FILE);
    const receipt = await reports.submit(amiri, shared());
    characters.put(amiri, characterId, {
      ...FILE,
      character: { name: 'Renamed', level: 9 },
    });
    expect(await storedSnapshot(repository, receipt.id)).toStrictEqual(FILE);
  });
});
