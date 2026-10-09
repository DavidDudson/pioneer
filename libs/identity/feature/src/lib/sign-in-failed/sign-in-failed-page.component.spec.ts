import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { HOME_PATH } from '@pioneer/identity/domain';
import type { ReturnPath } from '@pioneer/identity/domain';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { identityRoutes } from '../identity.routes';

describe('SignInFailedPage', () => {
  it('explains the failure and retries sign-in, returning home rather than here', async () => {
    const signIn = vi.fn<(returnTo?: ReturnPath) => void>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'account', children: identityRoutes }]),
        provideI18n({ en: async () => frontierMessages }),
        { provide: SessionStore, useValue: { signIn } },
      ],
    });
    const harness = await RouterTestingHarness.create('/account/sign-in-failed');
    await harness.fixture.whenStable();
    const root = harness.routeNativeElement;
    expect(root?.querySelector('h1')?.textContent.trim()).toBe('Sign-in did not complete');

    root?.querySelector('button')?.click();
    expect(signIn).toHaveBeenCalledWith(HOME_PATH);
  });
});
