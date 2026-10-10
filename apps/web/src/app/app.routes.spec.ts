import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Route } from '@angular/router';
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
});
