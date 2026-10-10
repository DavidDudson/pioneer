import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { campaignJoinRoutes, campaignRoutes } from '../../campaign.routes';
import { INVITE_STORAGE } from '../../data/pending-invite';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const gmId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';
const token = 'Wm9vbS16b29tLXRoZS1pbnZpdGUtdG9rZW4tZm9yLXQ';
const STORAGE_KEY = 'pioneer.campaign.pendingInvite';

const campaign = {
  id,
  version: 2,
  name: 'Abomination Vaults',
  gmId,
  members: [
    { id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10', userId: gmId, role: 'gm', joinedAt: '2026-10-10T10:00:00.000Z' },
  ],
  createdAt: '2026-10-10T10:00:00.000Z',
};

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

async function open(url: string, storage: Storage = sessionStorage): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'campaigns/join', children: campaignJoinRoutes },
          { path: 'campaigns', children: campaignRoutes },
        ],
        withComponentInputBinding(),
      ),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
      { provide: INVITE_STORAGE, useValue: storage },
    ],
  });
  return RouterTestingHarness.create(url);
}

describe('CampaignJoinPage', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('takes the token out of the URL, joins with it and opens the campaign', async () => {
    const harness = await open(`/campaigns/join#${token}`);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      const request = http.expectOne('/api/campaigns/join');
      // By the time the API is called, the address holds no token.
      expect(router.url).toBe('/campaigns/join');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toStrictEqual({ token });
      request.flush(campaign);
    });
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(router.url).toBe(`/campaigns/${id}`);
    });
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('joins with the token kept from before sign-in when the URL has none', async () => {
    sessionStorage.setItem(STORAGE_KEY, token);
    await open('/campaigns/join');
    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne('/api/campaigns/join');
      expect(request.request.body).toStrictEqual({ token });
      request.flush(campaign);
    });
  });

  it('keeps the token when the visitor must sign in first', async () => {
    await open(`/campaigns/join#${token}`);
    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController)
        .expectOne('/api/campaigns/join')
        .flush(
          { type: 'unauthorized', title: 'Unauthorized', status: 401, message: { key: 'problem.unauthorized' } },
          { status: 401, statusText: 'Unauthorized' },
        );
    });
    await vi.waitFor(() => {
      expect(sessionStorage.getItem(STORAGE_KEY)).toBe(token);
    });
  });

  it('says why a revoked link can’t be used, forgets it and does not retry', async () => {
    const harness = await open(`/campaigns/join#${token}`);
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
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    TestBed.inject(HttpTestingController).expectNone('/api/campaigns/join');
  });

  it('says a link without a valid token is not valid, without calling the API', async () => {
    const harness = await open('/campaigns/join#not-a-token');
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('This invite link is not valid.');
    });
    TestBed.inject(HttpTestingController).expectNone('/api/campaigns/join');
  });
});
