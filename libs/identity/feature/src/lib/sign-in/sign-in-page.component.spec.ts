import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { SessionStore, SIGN_IN_EXTRAS } from '@pioneer/identity/data-access';
import type { SignInExtra } from '@pioneer/identity/data-access';
import { OAuthProvider, ReturnPath } from '@pioneer/identity/domain';
import { ApiClient, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { identityRoutes } from '../identity.routes';
import { StubSignInExtra } from '../testing/stub-sign-in-extra.component';

interface Rendered {
  readonly root: HTMLElement;
  readonly signIn: Mock<(provider: OAuthProvider, returnTo: ReturnPath) => void>;
}

/** Renders the page with `/api/auth/providers` answering `providers`, and any sign-in `extras`. */
async function render(
  url: string,
  providers: readonly OAuthProvider[],
  extras?: readonly Type<SignInExtra>[],
): Promise<Rendered> {
  const signIn = vi.fn<(provider: OAuthProvider, returnTo: ReturnPath) => void>();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'account', children: identityRoutes }], withComponentInputBinding()),
      provideI18n({ en: async () => frontierMessages }),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: ApiClient, useValue: { call: async (): Promise<readonly OAuthProvider[]> => providers } },
      { provide: SessionStore, useValue: { signIn } },
      // Without extras, the token's own default applies, as in production.
      ...(extras === undefined ? [] : [{ provide: SIGN_IN_EXTRAS, useValue: extras }]),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await harness.fixture.whenStable();
  const root = harness.routeNativeElement;
  if (root === null) {
    throw new Error('Expected the sign-in page to render');
  }
  return { root, signIn };
}

function buttons(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')];
}

describe('SignInPage', () => {
  it('offers each configured provider and returns to the requested page', async () => {
    const { root, signIn } = await render('/account/sign-in?returnTo=%2Fcharacters', [
      OAuthProvider.GitHub,
      OAuthProvider.Google,
    ]);
    await vi.waitFor(() => {
      expect(buttons(root).map((button) => button.textContent.trim())).toStrictEqual([
        'Continue with GitHub',
        'Continue with Google',
      ]);
    });
    buttons(root)[1]?.click();
    expect(signIn).toHaveBeenCalledWith(OAuthProvider.Google, ReturnPath.parse('/characters'));
  });

  it('never returns off-site', async () => {
    const { root, signIn } = await render('/account/sign-in?returnTo=%2F%2Fevil.example', [OAuthProvider.Discord]);
    await vi.waitFor(() => {
      expect(buttons(root)).toHaveLength(1);
    });
    buttons(root)[0]?.click();
    expect(signIn).toHaveBeenCalledWith(OAuthProvider.Discord, ReturnPath.parse('/'));
  });

  it('says so when no provider is configured', async () => {
    const { root } = await render('/account/sign-in', []);
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Sign-in is not set up on this server.');
    });
  });
});

describe('SignInPage extras', () => {
  it('shows none by default', async () => {
    const { root } = await render('/account/sign-in', [OAuthProvider.GitHub]);
    expect(root.querySelector('pio-stub-sign-in-extra')).toBeNull();
  });

  it('shows each extra above the providers, told where to return', async () => {
    const { root } = await render('/account/sign-in?returnTo=%2Fcampaigns', [OAuthProvider.GitHub], [StubSignInExtra]);
    await vi.waitFor(() => {
      expect(root.querySelector('pio-stub-sign-in-extra')?.textContent.trim()).toBe('/campaigns');
      expect(root.querySelector('pio-stub-sign-in-extra + fr-async-region')).not.toBeNull();
    });
  });
});
