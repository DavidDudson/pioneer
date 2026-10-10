import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
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

async function open(): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'campaigns', children: campaignRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  return RouterTestingHarness.create(`/campaigns/${id}`);
}

describe('CampaignHomePage', () => {
  it('shows the campaign’s name and member count', async () => {
    const harness = await open();
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/campaigns/${id}`)
      .flush({
        id,
        version: 1,
        name: 'Abomination Vaults',
        gmId,
        members: [
          {
            id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10',
            userId: gmId,
            role: 'gm',
            joinedAt: '2026-10-10T10:00:00.000Z',
          },
        ],
        createdAt: '2026-10-10T10:00:00.000Z',
      });
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      const root = present(harness.routeNativeElement);
      expect(present(root.querySelector('h1')).textContent).toContain('Abomination Vaults');
      expect(root.textContent).toContain('1 member');
    });
  });

  it('says it could not load a campaign the user is not in', async () => {
    const harness = await open();
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/campaigns/${id}`)
      .flush(
        { type: 'not-found', title: 'Not Found', status: 404, message: { key: 'problem.notFound' } },
        { status: 404, statusText: 'Not Found' },
      );
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Could not load this campaign.');
    });
  });
});
