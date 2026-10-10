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
const token = 'Wm9vbS16b29tLXRoZS1pbnZpdGUtdG9rZW4tZm9yLXQ';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

async function open(linkToken = token): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'campaigns', children: campaignRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  return RouterTestingHarness.create(`/campaigns/join/${linkToken}`);
}

describe('CampaignJoinPage', () => {
  it('joins with the link’s token and opens the campaign', async () => {
    const harness = await open();
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      const request = http.expectOne('/api/campaigns/join');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toStrictEqual({ token });
      request.flush({
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
    });
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe(`/campaigns/${id}`);
    });
  });

  it('says why a revoked link can’t be used', async () => {
    const harness = await open();
    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController)
        .expectOne('/api/campaigns/join')
        .flush(
          { type: 'gone', title: 'Gone', status: 410, message: { key: 'campaign.join.revokedInvite' } },
          { status: 410, statusText: 'Gone' },
        );
    });
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('This invite link was revoked.');
      expect(text).toContain('Go to your campaigns');
    });
    // A failed join is not retried.
    TestBed.inject(HttpTestingController).expectNone('/api/campaigns/join');
  });

  it('says a malformed link is not valid, without calling the API', async () => {
    const harness = await open('not-a-token');
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('This invite link is not valid.');
    });
    TestBed.inject(HttpTestingController).expectNone('/api/campaigns/join');
  });
});
