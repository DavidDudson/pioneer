import { describe, expect, test } from 'bun:test';

import { BUG_REPORT_LIMIT, BugReportService, InMemoryBugReportRepository } from '@pioneer/identity/application';
import { BugReportId, BugReportStatus, BugReportSubmission, UserId } from '@pioneer/identity/domain';
import type { BugReport } from '@pioneer/identity/domain';
import { fixedClock, newId, Temporal } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { bugReportRoutes } from './bug-report-routes';

const NOW = '2026-10-15T08:00:00Z';

const BODY = {
  route: '/characters/amiri',
  appVersion: '1.2.3',
  locale: 'en',
  userAgent: 'Mozilla/5.0',
  description: 'The AC is wrong',
  steps: 'Open the sheet',
};

interface Fixture {
  readonly api: AnyElysia;
  readonly repository: InMemoryBugReportRepository;
}

function fixture(): Fixture {
  const repository = new InMemoryBugReportRepository();
  const reports = new BugReportService(repository, fixedClock(NOW));
  return { api: new Elysia().use(problemHandler).use(bugReportRoutes(reports, new FakeAuthenticator())), repository };
}

async function report(api: AnyElysia, body: unknown, user?: UserId): Promise<Response> {
  const headers = { 'content-type': 'application/json', ...(user === undefined ? {} : actingAs(user)) };
  return api.handle(
    new Request('http://localhost/me/bug-reports', { method: 'POST', headers, body: JSON.stringify(body) }),
  );
}

describe('bug report routes', () => {
  test('a signed-in user files a report as themselves', async () => {
    const amiri = UserId.parse(newId());
    const response = await report(fixture().api, BODY, amiri);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ...BODY, reporter: amiri, status: 'open' });
  });

  test('a signed-out request is refused', async () => {
    const response = await report(fixture().api, BODY);
    expect(response.status).toBe(401);
  });

  test.each([
    ['an empty description', { ...BODY, description: '  ' }],
    ['an unknown locale', { ...BODY, locale: 'xx' }],
    ['a reporter in the body', { ...BODY, reporter: newId() }],
    ['a character id that is not a UUID', { ...BODY, characterId: 'amiri' }],
  ])('%s is a 422', async (_name, body) => {
    const response = await report(fixture().api, body, UserId.parse(newId()));
    expect(response.status).toBe(422);
  });

  test('a report past the hourly limit is a 429', async () => {
    const { api, repository } = fixture();
    const amiri = UserId.parse(newId());
    const submission = BugReportSubmission.parse(BODY);
    const stored: BugReport[] = Array.from({ length: BUG_REPORT_LIMIT }, () => ({
      ...submission,
      id: BugReportId.parse(newId()),
      reporter: amiri,
      createdAt: Temporal.Instant.from(NOW),
      status: BugReportStatus.Open,
    }));
    await Promise.all(stored.map(async (seeded) => repository.insert(seeded)));
    const response = await report(api, BODY, amiri);
    expect(response.status).toBe(429);
  });
});
