import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import { ApiClient, ApiError } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import { provideSignInOnUnauthorized, signInRequired } from './sign-in-required';

const amiri = {
  id: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
  displayName: 'Amiri',
  emailVerified: false,
  createdAt: '2026-10-09T08:00:00.000Z',
  updatedAt: '2026-10-09T08:00:00.000Z',
};
const unauthorized = {
  type: 'unauthorized',
  title: 'Unauthorized',
  status: 401,
  message: { key: 'problem.unauthorized' },
};
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

/** Any call that needs a session. */
const getThings = new Endpoint({
  method: HttpMethod.Get,
  path: '/things',
  params: NoParams,
  query: NoQuery,
  body: NoBody,
  response: z.array(z.string()),
});

function setup(): HttpTestingController {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'mine', canActivate: [signInRequired], runGuardsAndResolvers: 'always', children: [] },
        { path: '**', children: [] },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      provideSignInOnUnauthorized(),
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe(signInRequired, () => {
  it('lets a signed-in user through', async () => {
    const http = setup();
    const router = TestBed.inject(Router);
    const navigating = router.navigateByUrl('/mine?sort=name');
    await vi.waitFor(() => {
      http.expectOne('/api/me').flush(amiri);
    });
    await navigating;
    expect(router.url).toBe('/mine?sort=name');
  });

  it('sends a signed-out visitor to sign in, returning to the page they asked for', async () => {
    const http = setup();
    const router = TestBed.inject(Router);
    const navigating = router.navigateByUrl('/mine?sort=name');
    await vi.waitFor(() => {
      http.expectOne('/api/me').flush(unauthorized, UNAUTHORIZED);
    });
    await navigating;
    expect(router.url).toBe('/account/sign-in?returnTo=%2Fmine%3Fsort%3Dname');
  });

  it('opens the page when the server cannot say who is signed in', async () => {
    const http = setup();
    const router = TestBed.inject(Router);
    const navigating = router.navigateByUrl('/mine');
    await vi.waitFor(() => {
      http.expectOne('/api/me').flush('', { status: 503, statusText: 'Unavailable' });
    });
    await navigating;
    expect(router.url).toBe('/mine');
  });
});

describe(provideSignInOnUnauthorized, () => {
  it('a 401 from any call prompts sign-in, returning to the current page', async () => {
    const http = setup();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/elsewhere');
    const pending = TestBed.inject(ApiClient).call(getThings, { params: {}, body: undefined });
    http.expectOne('/api/things').flush(unauthorized, UNAUTHORIZED);
    await expect(pending).rejects.toSatisfy((error: unknown) => ApiError.isUnauthorized(error));
    await vi.waitFor(() => {
      expect(router.url).toBe('/account/sign-in?returnTo=%2Felsewhere');
    });
  });
});
