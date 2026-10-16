import { beforeEach, describe, expect, test } from 'bun:test';

import {
  BugReportService,
  BugReportTriageService,
  InMemoryBugReportRepository,
  InMemoryCharacterSnapshotSource,
  InMemoryUserRepository,
} from '@pioneer/identity/application';
import {
  BugReportId,
  BugReportStatus,
  BugReportSubmission,
  OAuthProvider,
  ProviderSubject,
  User,
  UserId,
  UserRole,
} from '@pioneer/identity/domain';
import type { BugReport } from '@pioneer/identity/domain';
import { ProfileBuilder } from '@pioneer/identity/domain/testing';
import { fixedClock, newId, Temporal } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { bugReportRoutes } from './bug-report-routes';

const NOW = Temporal.Instant.from('2026-10-16T08:00:00Z');
const SNAPSHOT = { format: 'pioneer-character', formatVersion: 1, character: { name: 'Amiri' } };

const DETAILS = BugReportSubmission.omit({ shareCharacter: true }).parse({
  route: '/characters/amiri',
  appVersion: '1.2.3',
  locale: 'en',
  userAgent: 'Mozilla/5.0',
  description: 'The AC is wrong',
  steps: 'Open the sheet',
});

interface Fixture {
  readonly api: AnyElysia;
  readonly maintainer: UserId;
  readonly member: UserId;
  readonly older: BugReport;
  readonly newer: BugReport;
}

/** One request to the API, as `user` (signed out when absent). */
interface Call {
  readonly method: string;
  readonly path: string;
  readonly user?: UserId;
  readonly body?: unknown;
}

function reportFrom(reporter: UserId, createdAt: Temporal.Instant, snapshot?: BugReport['snapshot']): BugReport {
  return {
    id: BugReportId.parse(newId()),
    reporter,
    createdAt,
    ...DETAILS,
    snapshot,
    status: BugReportStatus.Open,
  };
}

async function account(users: InMemoryUserRepository, role: UserRole): Promise<UserId> {
  const id = UserId.parse(newId());
  const member = User.fromProfile(id, new ProfileBuilder().build(), NOW);
  const user = User.codec.decode({ ...User.codec.encode(member), role });
  await users.insertWithAccount(user, OAuthProvider.GitHub, ProviderSubject.parse(newId()));
  return id;
}

async function fixture(): Promise<Fixture> {
  const users = new InMemoryUserRepository();
  const repository = new InMemoryBugReportRepository();
  const maintainer = await account(users, UserRole.Maintainer);
  const member = await account(users, UserRole.Member);
  const older = reportFrom(member, NOW.subtract({ hours: 3 }));
  const newer = reportFrom(member, NOW.subtract({ hours: 1 }), SNAPSHOT);
  await repository.insert(older);
  await repository.insert(newer);
  const reports = new BugReportService(repository, new InMemoryCharacterSnapshotSource(), fixedClock(NOW.toString()));
  const triage = new BugReportTriageService(repository, users);
  const api = new Elysia().use(problemHandler).use(bugReportRoutes(reports, triage, new FakeAuthenticator()));
  return { api, maintainer, member, older, newer };
}

async function call(api: AnyElysia, { method, path, user, body }: Call): Promise<Response> {
  const headers = { 'content-type': 'application/json', ...(user === undefined ? {} : actingAs(user)) };
  return api.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}

describe('bug report triage routes', () => {
  let setup: Fixture;

  beforeEach(async () => {
    setup = await fixture();
  });

  test('a maintainer lists the reports newest first, saying which carry a snapshot', async () => {
    const response = await call(setup.api, { method: 'GET', path: '/bug-reports', user: setup.maintainer });
    expect(response.status).toBe(200);
    const items = (await response.json()) as { id: string; hasSnapshot: boolean }[];
    expect(items.map(({ id }) => id)).toStrictEqual([setup.newer.id, setup.older.id]);
    expect(items.map(({ hasSnapshot }) => hasSnapshot)).toStrictEqual([true, false]);
  });

  test('a maintainer reads one report in full, with its snapshot', async () => {
    const path = `/bug-reports/${setup.newer.id}`;
    const response = await call(setup.api, { method: 'GET', path, user: setup.maintainer });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: setup.newer.id, steps: 'Open the sheet', snapshot: SNAPSHOT });
  });

  test('a maintainer sets where a report stands, and it stays', async () => {
    const path = `/bug-reports/${setup.older.id}`;
    const body = { status: BugReportStatus.Confirmed };
    const changed = await call(setup.api, { method: 'PATCH', path, user: setup.maintainer, body });
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({ status: 'confirmed' });
    const read = await call(setup.api, { method: 'GET', path, user: setup.maintainer });
    expect(await read.json()).toMatchObject({ status: 'confirmed' });
  });

  test.each([
    ['lists', { method: 'GET', path: '/bug-reports' }],
    ['reads', { method: 'GET', path: '/bug-reports/:newer' }],
    ['triages', { method: 'PATCH', path: '/bug-reports/:newer', body: { status: 'fixed' } }],
  ])('a member who %s gets a 404, as if there were no such page', async (_what, request) => {
    const path = request.path.replace(':newer', setup.newer.id);
    const response = await call(setup.api, { ...request, path, user: setup.member });
    expect(response.status).toBe(404);
  });

  test('a member cannot change a status even on their own report', async () => {
    const path = `/bug-reports/${setup.newer.id}`;
    await call(setup.api, { method: 'PATCH', path, user: setup.member, body: { status: 'declined' } });
    const read = await call(setup.api, { method: 'GET', path, user: setup.maintainer });
    expect(await read.json()).toMatchObject({ status: 'open' });
  });

  test('a signed-out request is a 401', async () => {
    const response = await call(setup.api, { method: 'GET', path: '/bug-reports' });
    expect(response.status).toBe(401);
  });

  test('a report that does not exist is a 404', async () => {
    const path = `/bug-reports/${newId()}`;
    const response = await call(setup.api, { method: 'GET', path, user: setup.maintainer });
    expect(response.status).toBe(404);
  });

  test('a status that is not one of the four is a 422', async () => {
    const path = `/bug-reports/${setup.newer.id}`;
    const body = { status: 'closed' };
    const response = await call(setup.api, { method: 'PATCH', path, user: setup.maintainer, body });
    expect(response.status).toBe(422);
  });
});
