import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DistanceUnit, Locale } from '@pioneer/shared/kernel';
import { ApiError, LocalePreferences } from '@pioneer/shared/web';
import type { DisplayChoices } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { AccountPreferences } from './account-preferences';
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
const metresOnly = { distanceUnit: 'metres' };

interface Harness {
  readonly preferences: AccountPreferences;
  readonly http: HttpTestingController;
  readonly adopt: Mock<(choices: DisplayChoices) => Promise<void>>;
  readonly reset: Mock<() => Promise<void>>;
}

function setup(): Harness {
  const adopt = vi.fn<(choices: DisplayChoices) => Promise<void>>(async () => undefined);
  const reset = vi.fn<() => Promise<void>>(async () => undefined);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: LocalePreferences, useValue: { adopt, reset } },
    ],
  });
  return { preferences: TestBed.inject(AccountPreferences), http: TestBed.inject(HttpTestingController), adopt, reset };
}

/** Answers `/api/me`, then waits for the preferences request. */
async function signedInAs(http: HttpTestingController, user: object | undefined): Promise<void> {
  await vi.waitFor(() => {
    const me = http.expectOne('/api/me');
    if (user === undefined) {
      me.flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
    } else {
      me.flush(user);
    }
  });
}

describe(AccountPreferences, () => {
  it('shows a signed-in user their account preferences, defaults for what they never chose', async () => {
    const { preferences, http, adopt } = setup();
    const loading = preferences.load();
    await signedInAs(http, amiri);
    await vi.waitFor(() => {
      http.expectOne('/api/me/preferences').flush(metresOnly);
    });
    await loading;

    expect(adopt).toHaveBeenLastCalledWith({ ui: undefined, content: undefined, distanceUnit: DistanceUnit.Metres });
  });

  it('gives signed-out visitors the defaults without asking for preferences', async () => {
    const { preferences, http, adopt, reset } = setup();
    const loading = preferences.load();
    await signedInAs(http, undefined);
    await loading;

    http.expectNone('/api/me/preferences');
    expect(reset).toHaveBeenCalledWith();
    expect(adopt).not.toHaveBeenCalled();
  });

  it('keeps the cached choices when the server cannot answer', async () => {
    const { preferences, http, adopt, reset } = setup();
    const loading = preferences.load();
    await signedInAs(http, amiri);
    await vi.waitFor(() => {
      http.expectOne('/api/me/preferences').flush({}, { status: 503, statusText: 'Unavailable' });
    });
    await loading;

    expect(adopt).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it('shows a change at once, then what the account saved', async () => {
    const { preferences, http, adopt } = setup();
    const updating = preferences.update({ uiLocale: Locale.English });
    expect(adopt).toHaveBeenLastCalledWith({ ui: Locale.English, content: undefined, distanceUnit: undefined });

    await vi.waitFor(() => {
      const request = http.expectOne({ method: 'PATCH', url: '/api/me/preferences' });
      expect(request.request.body).toStrictEqual({ uiLocale: 'en' });
      request.flush({ ...metresOnly, uiLocale: 'en' });
    });
    await updating;

    expect(adopt).toHaveBeenLastCalledWith({
      ui: Locale.English,
      content: undefined,
      distanceUnit: DistanceUnit.Metres,
    });
  });

  it('puts the previous preferences back when the account cannot save', async () => {
    const { preferences, http, adopt } = setup();
    const answering = vi.waitFor(() => {
      http
        .expectOne({ method: 'PATCH', url: '/api/me/preferences' })
        .flush({}, { status: 503, statusText: 'Unavailable' });
    });

    await expect(preferences.update({ distanceUnit: DistanceUnit.Metres })).rejects.toBeInstanceOf(ApiError);
    await answering;
    expect(adopt).toHaveBeenLastCalledWith({ ui: undefined, content: undefined, distanceUnit: undefined });
  });

  it('goes back to the defaults when the user signs out', async () => {
    const { preferences, http, reset } = setup();
    const loading = preferences.load();
    await signedInAs(http, amiri);
    await vi.waitFor(() => {
      http.expectOne('/api/me/preferences').flush(metresOnly);
    });
    await loading;
    expect(reset).not.toHaveBeenCalled();

    await TestBed.inject(SessionStore).signedOut();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(reset).toHaveBeenCalledWith();
    });
  });
});
