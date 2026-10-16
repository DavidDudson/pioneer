import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { BugReportListItem, IdentityContract } from '@pioneer/identity/domain';
import { HttpStatus } from '@pioneer/shared/kernel';
import { ApiClient, ApiError, PREFERENCE_STORAGE, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { identityRoutes } from '../../identity.routes';

const NEWER = BugReportListItem.parse({
  id: '0199d2a0-0000-7000-8000-000000000001',
  status: 'confirmed',
  route: '/characters/amiri',
  description: 'The AC is wrong',
  reporter: '0199d2a0-0000-7000-8000-0000000000a1',
  reporterName: 'Valeros',
  createdAt: '2026-10-16T08:00:00.000Z',
  hasSnapshot: true,
});
const OLDER = BugReportListItem.parse({
  id: '0199d2a0-0000-7000-8000-000000000002',
  status: 'open',
  route: '/characters/amiri',
  description: 'The sheet will not save',
  reporter: '0199d2a0-0000-7000-8000-0000000000a1',
  createdAt: '2026-10-15T08:00:00.000Z',
  hasSnapshot: false,
});

async function render(reports: readonly BugReportListItem[] | Error): Promise<HTMLElement> {
  const call = vi.fn<(endpoint: unknown) => Promise<unknown>>(async (endpoint) => {
    if (endpoint !== IdentityContract.listBugReports) {
      throw new Error('Unexpected call');
    }
    if (reports instanceof Error) {
      throw reports;
    }
    return reports;
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'account', children: identityRoutes }]),
      provideI18n({ en: async () => frontierMessages }),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: PREFERENCE_STORAGE, useValue: undefined },
      { provide: SessionStore, useValue: { whenKnown: async (): Promise<object> => ({ displayName: 'Amiri' }) } },
      { provide: ApiClient, useValue: { call } },
    ],
  });
  const harness = await RouterTestingHarness.create('/account/bug-reports');
  await harness.fixture.whenStable();
  const element = harness.routeNativeElement;
  if (element === null) {
    throw new Error('Expected a page to render');
  }
  return element;
}

describe('BugReportListPage', () => {
  it('lists each report with where it stands, who sent it and whether a character came with it', async () => {
    const page = await render([NEWER, OLDER]);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('The AC is wrong');
    });
    const text = page.textContent;
    for (const expected of ['The sheet will not save', 'Confirmed', 'Open', 'Valeros', 'an account that is gone']) {
      expect(text).toContain(expected);
    }
    expect(text.match(/Character shared/gu)).toHaveLength(1);
  });

  it('links each report to its own page', async () => {
    const page = await render([NEWER]);
    await vi.waitFor(() => {
      expect(page.querySelector('a')).not.toBeNull();
    });
    expect(page.querySelector('a')?.getAttribute('href')).toBe(`/account/bug-reports/${NEWER.id}`);
  });

  it('says so when there are no reports', async () => {
    const page = await render([]);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('No bug reports yet');
    });
  });

  it('shows the load error when the server refuses, as it does for a member', async () => {
    const page = await render(new ApiError(HttpStatus.NotFound, undefined));
    await vi.waitFor(() => {
      expect(page.textContent).toContain('Could not load the bug reports');
    });
  });
});
