import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DisplayName, OAuthProvider, ReturnPath } from '@pioneer/identity/domain';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { SessionStore } from './session-store';

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

interface Harness {
  readonly store: SessionStore;
  readonly http: HttpTestingController;
  readonly assign: Mock<(url: string) => void>;
}

function setup(): Harness {
  const assign = vi.fn<(url: string) => void>();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: DOCUMENT, useValue: { location: { assign } } },
    ],
  });
  return { store: TestBed.inject(SessionStore), http: TestBed.inject(HttpTestingController), assign };
}

async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

describe(SessionStore, () => {
  it('is signed in when /api/me answers with a user', async () => {
    const { store, http } = setup();
    TestBed.tick();
    http.expectOne('/api/me').flush(amiri);
    await settle();
    expect(store.known()).toBe(true);
    expect(store.user()?.displayName).toBe(DisplayName.parse('Amiri'));
  });

  it('is signed out, not failed, on a 401', async () => {
    const { store, http } = setup();
    TestBed.tick();
    http.expectOne('/api/me').flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
    await settle();
    expect(store.known()).toBe(true);
    expect(store.user()).toBeUndefined();
  });

  it('signs in through the API with the chosen provider, returning where asked', () => {
    const { store, assign } = setup();
    store.signIn(OAuthProvider.Discord, ReturnPath.parse('/characters'));
    expect(assign).toHaveBeenCalledWith('/api/auth/discord/login?returnTo=%2Fcharacters');
  });

  it('opens the sign-in page, remembering the current page', async () => {
    const { store } = setup();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/characters');
    await store.showSignIn();
    expect(router.url).toBe('/account/sign-in?returnTo=%2Fcharacters');
  });

  it('signing out forgets the user', async () => {
    const { store, http } = setup();
    TestBed.tick();
    http.expectOne('/api/me').flush(amiri);
    await settle();
    const signingOut = store.signOut();
    http.expectOne({ method: 'POST', url: '/api/auth/sign-out' }).flush({});
    await signingOut;
    await vi.waitFor(() => {
      expect(store.user()).toBeUndefined();
    });
  });

  it('signing out everywhere forgets the user', async () => {
    const { store, http } = setup();
    TestBed.tick();
    http.expectOne('/api/me').flush(amiri);
    await settle();
    const signingOut = store.signOutEverywhere();
    http.expectOne({ method: 'POST', url: '/api/auth/sign-out-everywhere' }).flush({});
    await signingOut;
    await vi.waitFor(() => {
      expect(store.user()).toBeUndefined();
    });
  });

  it('whenKnown waits for the server, then answers from the cache', async () => {
    const { store, http } = setup();
    const first = store.whenKnown();
    await vi.waitFor(() => {
      http.expectOne('/api/me').flush(amiri);
    });
    const user = await first;
    expect(user?.displayName).toBe(DisplayName.parse('Amiri'));
    const again = await store.whenKnown();
    expect(again?.displayName).toBe(DisplayName.parse('Amiri'));
    http.expectNone('/api/me');
  });

  it('promptSignIn forgets the user and opens sign-in, returning to the current page', async () => {
    const { store, http } = setup();
    TestBed.tick();
    http.expectOne('/api/me').flush(amiri);
    await settle();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/characters');
    await store.promptSignIn();
    expect(store.user()).toBeUndefined();
    expect(router.url).toBe('/account/sign-in?returnTo=%2Fcharacters');
    await store.promptSignIn();
    expect(router.url).toBe('/account/sign-in?returnTo=%2Fcharacters');
  });

  it('signing out drops everything cached for the user', () => {
    const { store } = setup();
    const client = TestBed.inject(QueryClient);
    client.setQueryData(['character', 'list'], ['Kyra']);
    store.signedOut();
    expect(client.getQueryData(['character', 'list'])).toBeUndefined();
    expect(client.getQueryData(['identity', 'me'])).toStrictEqual({ user: undefined });
  });
});
