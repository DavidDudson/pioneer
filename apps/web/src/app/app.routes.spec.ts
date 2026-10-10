import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideSignInOnUnauthorized } from '@pioneer/identity/data-access';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { appRoutes } from './app.routes';

const unauthorized = {
  type: 'unauthorized',
  title: 'Unauthorized',
  status: 401,
  message: { key: 'problem.unauthorized' },
};

/** The app's route for `path`, as configured. */
function route(path: string): Route {
  const found = appRoutes.find((candidate) => candidate.path === path);
  if (found === undefined) {
    throw new Error(`No route for ${path}`);
  }
  return found;
}

describe('app routes', () => {
  it.each(['characters', 'campaigns'])('sends a signed-out visitor from /%s to sign-in and back', async (path) => {
    TestBed.configureTestingModule({
      providers: [
        // The real guarded route; the sign-in page itself is a stub.
        provideRouter([route(path), { path: 'account/sign-in', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      ],
    });
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl(`/${path}`);
    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController)
        .expectOne('/api/me')
        .flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
    });
    await navigation;
    expect(router.url).toBe(`/account/sign-in?returnTo=%2F${path}`);
  });

  it('takes an invite token out of the URL before a signed-out visitor is sent to sign in', async () => {
    const token = 'Wm9vbS16b29tLXRoZS1pbnZpdGUtdG9rZW4tZm9yLXQ';
    TestBed.configureTestingModule({
      providers: [
        provideRouter([route('campaigns/join'), route('campaigns'), { path: 'account/sign-in', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
        provideI18n({ en: async () => frontierMessages }),
        provideSignInOnUnauthorized(),
      ],
    });
    await RouterTestingHarness.create(`/campaigns/join#${token}`);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      const join = http.expectOne('/api/campaigns/join');
      expect(join.request.body).toStrictEqual({ token });
      join.flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
    });

    await vi.waitFor(() => {
      expect(router.url).toBe('/account/sign-in?returnTo=%2Fcampaigns%2Fjoin');
    });
    expect(sessionStorage.getItem('pioneer.campaign.pendingInvite')).toBe(token);
    sessionStorage.clear();
  });
});
