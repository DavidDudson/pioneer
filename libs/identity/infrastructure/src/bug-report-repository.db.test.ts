import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { BugReportId, BugReportStatus, BugReportSubmission, DisplayName, UserId } from '@pioneer/identity/domain';
import type { BugReport } from '@pioneer/identity/domain';
import { newId, Temporal } from '@pioneer/shared/kernel';
import type { Uuid } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq } from 'drizzle-orm';

import { DrizzleBugReportRepository } from './drizzle-bug-report-repository';
import { bugReports, users } from './identity.table';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();
const NOW = Temporal.Instant.from('2026-10-15T08:00:00Z');

const SUBMISSION = BugReportSubmission.parse({
  route: '/characters/amiri',
  appVersion: '1.2.3',
  locale: 'en',
  userAgent: 'Mozilla/5.0',
  description: 'The AC is wrong',
  steps: 'Open the sheet',
});

function reportBy(reporter: UserId, createdAt: Temporal.Instant, characterId?: Uuid): BugReport {
  return {
    ...SUBMISSION,
    id: BugReportId.parse(newId()),
    reporter,
    createdAt,
    characterId,
    status: BugReportStatus.Open,
  };
}

describe.skipIf(adminUrl === undefined)('DrizzleBugReportRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let repository: DrizzleBugReportRepository;

  async function newUser(): Promise<UserId> {
    const id = UserId.parse(newId());
    const at = NOW.toString();
    const displayName = DisplayName.parse('Amiri');
    await database.db.insert(users).values({ id, displayName, emailVerified: false, createdAt: at, updatedAt: at });
    return id;
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleBugReportRepository(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a stored report reads back unchanged', async () => {
    const stored = reportBy(await newUser(), NOW, newId());
    await repository.insert(stored);
    expect(await repository.findById(stored.id)).toStrictEqual(stored);
  });

  test('a report without a character reads back without one', async () => {
    const stored = reportBy(await newUser(), NOW);
    await repository.insert(stored);
    const found = await repository.findById(stored.id);
    expect(found?.characterId).toBeUndefined();
  });

  test('an unknown report is not found', async () => {
    const unknown = BugReportId.parse(newId());
    const found = await repository.findById(unknown);
    expect(found).toBeUndefined();
  });

  test('counts only the reporter’s reports since the cutoff', async () => {
    const amiri = await newUser();
    const ezren = await newUser();
    const hourAgo = NOW.subtract({ hours: 1 });
    await repository.insert(reportBy(amiri, NOW.subtract({ hours: 2 })));
    await repository.insert(reportBy(amiri, NOW.subtract({ minutes: 30 })));
    await repository.insert(reportBy(amiri, NOW));
    await repository.insert(reportBy(ezren, NOW));
    expect(await repository.countSince(amiri, hourAgo)).toBe(2);
  });

  test('reports need an existing user', async () => {
    const orphan = reportBy(UserId.parse(newId()), NOW);
    expect(await rejection(repository.insert(orphan))).toBeInstanceOf(Error);
  });

  test('deleting a user deletes their reports', async () => {
    const amiri = await newUser();
    const stored = reportBy(amiri, NOW);
    await repository.insert(stored);
    await database.db.delete(users).where(eq(users.id, amiri));
    const rows = await database.db.select().from(bugReports).where(eq(bugReports.id, stored.id));
    expect(rows).toStrictEqual([]);
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
