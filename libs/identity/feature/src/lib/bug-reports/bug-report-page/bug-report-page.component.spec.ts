import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { BugReportDetail, IdentityContract } from '@pioneer/identity/domain';
import { ApiClient, PREFERENCE_STORAGE, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { identityRoutes } from '../../identity.routes';
import { snapshotFileName } from '../save-snapshot';

const SNAPSHOT = { format: 'pioneer-character', formatVersion: 1, character: { name: 'Amiri' } };
const REPORT = BugReportDetail.parse({
  id: '0199d2a0-0000-7000-8000-000000000001',
  status: 'open',
  route: '/characters/amiri',
  appVersion: '1.2.3',
  locale: 'en',
  userAgent: 'Mozilla/5.0',
  description: 'The AC is wrong',
  steps: 'Open the sheet',
  reporter: '0199d2a0-0000-7000-8000-0000000000a1',
  reporterName: 'Valeros',
  createdAt: '2026-10-16T08:00:00.000Z',
  snapshot: SNAPSHOT,
});

interface Rendered {
  readonly page: HTMLElement;
  readonly sent: { status: string }[];
}

async function render(report: BugReportDetail): Promise<Rendered> {
  const sent: { status: string }[] = [];
  const call = vi.fn<(endpoint: unknown, input: { body?: { status: string } }) => Promise<unknown>>(
    async (endpoint, input) => {
      if (endpoint === IdentityContract.triageBugReport && input.body !== undefined) {
        sent.push(input.body);
        return { ...report, status: input.body.status };
      }
      return report;
    },
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'account', children: identityRoutes }], withComponentInputBinding()),
      provideI18n({ en: async () => frontierMessages }),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: PREFERENCE_STORAGE, useValue: undefined },
      { provide: SessionStore, useValue: { whenKnown: async (): Promise<object> => ({ displayName: 'Amiri' }) } },
      { provide: ApiClient, useValue: { call } },
    ],
  });
  const harness = await RouterTestingHarness.create(`/account/bug-reports/${report.id}`);
  await harness.fixture.whenStable();
  const element = harness.routeNativeElement;
  if (element === null) {
    throw new Error('Expected a page to render');
  }
  return { page: element, sent };
}

function buttonLabelled(page: HTMLElement, label: string): HTMLButtonElement {
  const found = [...page.querySelectorAll('button')].find((each) => each.textContent.includes(label));
  if (found === undefined) {
    throw new Error(`No button labelled ${label}`);
  }
  return found;
}

describe('BugReportPage', () => {
  it('shows what the reporter wrote and where it came from', async () => {
    const { page } = await render(REPORT);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('The AC is wrong');
    });
    expect(page.textContent).toContain('Open the sheet');
    expect(page.textContent).toContain('/characters/amiri');
    expect(page.textContent).toContain('Mozilla/5.0');
    expect(page.textContent).toContain('Valeros');
  });

  it('sets where the report stands, and shows it', async () => {
    const { page, sent } = await render(REPORT);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('The AC is wrong');
    });
    buttonLabelled(page, 'Confirm').click();
    await vi.waitFor(() => {
      expect(sent).toStrictEqual([{ status: 'confirmed' }]);
    });
    await vi.waitFor(() => {
      expect(page.textContent).toContain('Confirmed');
    });
  });

  it('offers the shared character as a file, named for the report', async () => {
    const { page } = await render(REPORT);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('Save character file');
    });
    expect(snapshotFileName(REPORT.id)).toBe('bug-report-0199d2a0.pioneer.json');
  });

  it('says so when the reporter did not share a character', async () => {
    const { snapshot: _dropped, ...unshared } = REPORT;
    const { page } = await render(unshared);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('The reporter did not share a character');
    });
    expect(page.textContent).not.toContain('Save character file');
  });
});
