import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { campaignRoutes } from '../../campaign.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const gmId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

function campaignJson(name: string, memberCount: number): object {
  const members = Array.from({ length: memberCount }, (_unused, index) => ({
    id: `0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e1${index}`,
    userId: index === 0 ? gmId : `1d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e1${index}`,
    role: index === 0 ? 'gm' : 'player',
    joinedAt: '2026-10-10T10:00:00.000Z',
  }));
  return { id, version: 1, name, gmId, members, createdAt: '2026-10-10T10:00:00.000Z' };
}

async function open(): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      // Mounted below a parent path like the app does, so absolute navigation would miss.
      provideRouter([{ path: 'campaigns', children: campaignRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  return RouterTestingHarness.create('/campaigns');
}

describe('CampaignListPage', () => {
  it('lists the user’s campaigns with their member counts', async () => {
    const harness = await open();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/campaigns')
      .flush([campaignJson('Abomination Vaults', 3)]);
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('Abomination Vaults');
      expect(text).toContain('3 members');
    });
  });

  it('says so when the user has no campaigns', async () => {
    const harness = await open();
    TestBed.inject(HttpTestingController).expectOne('/api/campaigns').flush([]);
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('No campaigns yet');
    });
  });

  it('opens the new campaign under the feature route after create', async () => {
    const harness = await open();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/campaigns').flush([]);
    await harness.fixture.whenStable();

    const root = present(harness.routeNativeElement);
    // Text comes from the route's `campaign` message scope, loaded with the page's code.
    expect(root.textContent).toContain('New campaign');
    const name = present(root.querySelector('input'));
    name.value = 'Abomination Vaults';
    name.dispatchEvent(new Event('input'));
    harness.detectChanges();
    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    await harness.fixture.whenStable();

    const create = http.expectOne({ method: 'POST', url: '/api/campaigns' });
    expect(create.request.body).toStrictEqual({ name: 'Abomination Vaults' });
    create.flush(campaignJson('Abomination Vaults', 1));

    const router = TestBed.inject(Router);
    await vi.waitFor(() => {
      expect(router.url).toBe(`/campaigns/${id}`);
    });
  });
});
