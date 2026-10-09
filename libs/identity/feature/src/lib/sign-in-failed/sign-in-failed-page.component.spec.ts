import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { identityRoutes } from '../identity.routes';

describe('SignInFailedPage', () => {
  it('explains the failure and links back to the sign-in page', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'account', children: identityRoutes }]),
        provideI18n({ en: async () => frontierMessages }),
      ],
    });
    const harness = await RouterTestingHarness.create('/account/sign-in-failed');
    await harness.fixture.whenStable();
    const root = harness.routeNativeElement;
    expect(root?.querySelector('h1')?.textContent.trim()).toBe('Sign-in did not complete');
    const retry = root?.querySelector('a');
    expect(retry?.getAttribute('href')).toBe('/account/sign-in');
    expect(retry?.textContent.trim()).toBe('Try again');
  });
});
