import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { IdentityContract, SessionSummary } from '@pioneer/identity/domain';
import type { User } from '@pioneer/identity/domain';
import { ApiClient, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { identityRoutes } from '../identity.routes';

const SIGNED_IN = '2026-10-01T08:00:00.000Z';
const THIS_BROWSER = SessionSummary.parse({
  id: '0199d2a0-0000-7000-8000-000000000001',
  createdAt: SIGNED_IN,
  lastSeenAt: SIGNED_IN,
  current: true,
});
const PHONE = SessionSummary.parse({
  id: '0199d2a0-0000-7000-8000-000000000002',
  createdAt: SIGNED_IN,
  lastSeenAt: SIGNED_IN,
  current: false,
});

/** Just the parts of `SessionStore` the account page uses. */
interface FakeSession {
  readonly user: () => User | undefined;
  readonly known: () => boolean;
  readonly signedOut: Mock<() => void>;
  readonly signOutEverywhere: Mock<() => Promise<void>>;
  readonly showSignIn: Mock<() => Promise<void>>;
}

interface Rendered {
  readonly root: HTMLElement;
  readonly session: FakeSession;
  readonly call: Mock<(endpoint: unknown, input: unknown) => Promise<unknown>>;
}

async function render(signedIn: boolean): Promise<Rendered> {
  const session: FakeSession = {
    user: (): User | undefined => (signedIn ? ({ displayName: 'Amiri' } as User) : undefined),
    known: (): boolean => true,
    signedOut: vi.fn<() => void>(),
    signOutEverywhere: vi.fn<() => Promise<void>>(async () => undefined),
    showSignIn: vi.fn<() => Promise<void>>(async () => undefined),
  };
  const call = vi.fn<(endpoint: unknown, input: unknown) => Promise<unknown>>(async (endpoint) =>
    endpoint === IdentityContract.sessions ? [THIS_BROWSER, PHONE] : {},
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'account', children: identityRoutes }]),
      provideI18n({ en: async () => frontierMessages }),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: ApiClient, useValue: { call } },
      { provide: SessionStore, useValue: session },
    ],
  });
  const harness = await RouterTestingHarness.create('/account');
  await harness.fixture.whenStable();
  const root = harness.routeNativeElement;
  if (root === null) {
    throw new Error('Expected the account page to render');
  }
  return { root, session, call };
}

function button(root: HTMLElement, label: string): HTMLButtonElement {
  const match = [...root.querySelectorAll('button')].find((each) => each.textContent.trim() === label);
  if (match === undefined) {
    throw new Error(`No button labelled ${label}`);
  }
  return match;
}

function rows(root: HTMLElement): string[] {
  return [...root.querySelectorAll('pio-session-row')].map((row) => row.textContent.replaceAll(/\s+/gu, ' ').trim());
}

describe('AccountPage', () => {
  it('lists every signed-in browser, this one first and marked', async () => {
    const { root } = await render(true);
    await vi.waitFor(() => {
      expect(rows(root)).toHaveLength(2);
    });
    expect(rows(root)[0]).toContain('This browser');
    expect(rows(root)[0]).toContain('Sign out');
    expect(rows(root)[1]).toContain('Another browser');
    expect(rows(root)[1]).toContain('Sign it out');
  });

  it('revoking another browser removes just that row', async () => {
    const { root, call, session } = await render(true);
    await vi.waitFor(() => {
      expect(rows(root)).toHaveLength(2);
    });
    button(root, 'Sign it out').click();
    await vi.waitFor(() => {
      expect(rows(root)).toHaveLength(1);
    });
    expect(call).toHaveBeenCalledWith(IdentityContract.revokeSession, { params: { id: PHONE.id }, body: undefined });
    expect(session.signedOut).not.toHaveBeenCalled();
  });

  it('revoking this browser signs it out', async () => {
    const { root, session } = await render(true);
    await vi.waitFor(() => {
      expect(rows(root)).toHaveLength(2);
    });
    button(root, 'Sign out').click();
    await vi.waitFor(() => {
      expect(session.signedOut).toHaveBeenCalledTimes(1);
    });
  });

  it('signs out everywhere only after a second, inline click', async () => {
    const { root, session } = await render(true);
    button(root, 'Sign out everywhere').click();
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Sign out of every browser, this one included?');
    });
    button(root, 'Cancel').click();
    await vi.waitFor(() => {
      expect(root.textContent).not.toContain('this one included?');
    });
    expect(session.signOutEverywhere).not.toHaveBeenCalled();

    button(root, 'Sign out everywhere').click();
    await vi.waitFor(() => {
      expect(root.textContent).toContain('this one included?');
    });
    button(root, 'Yes, sign out everywhere').click();
    await vi.waitFor(() => {
      expect(session.signOutEverywhere).toHaveBeenCalledTimes(1);
    });
  });

  it('offers sign-in when signed out, without asking for sessions', async () => {
    const { root, session, call } = await render(false);
    button(root, 'Sign in').click();
    expect(session.showSignIn).toHaveBeenCalledTimes(1);
    expect(call).not.toHaveBeenCalled();
  });
});
