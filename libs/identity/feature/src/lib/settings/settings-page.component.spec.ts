import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages, SelectField } from '@pioneer/frontier';
import { AccountPreferences, SessionStore } from '@pioneer/identity/data-access';
import { DistanceUnit, Locale } from '@pioneer/shared/kernel';
import { ApiClient, PREFERENCE_STORAGE, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { identityRoutes } from '../identity.routes';

interface Rendered {
  readonly harness: RouterTestingHarness;
  readonly update: Mock<(patch: object) => Promise<void>>;
}

async function render(signedIn: boolean, saves = true): Promise<Rendered> {
  const update = vi.fn<(patch: object) => Promise<void>>(async () => {
    if (!saves) {
      throw new Error('unavailable');
    }
  });
  const session = {
    whenKnown: async (): Promise<object | undefined> => (signedIn ? { displayName: 'Amiri' } : undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'account', children: identityRoutes }]),
      provideI18n({ en: async () => frontierMessages }),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: PREFERENCE_STORAGE, useValue: undefined },
      // The sign-in page asks for providers when a signed-out visitor lands there.
      { provide: ApiClient, useValue: { call: async (): Promise<unknown> => [] } },
      { provide: SessionStore, useValue: session },
      { provide: AccountPreferences, useValue: { update } },
    ],
  });
  const harness = await RouterTestingHarness.create('/account/settings');
  await harness.fixture.whenStable();
  return { harness, update };
}

function root(harness: RouterTestingHarness): HTMLElement {
  const element = harness.routeNativeElement;
  if (element === null) {
    throw new Error('Expected a page to render');
  }
  return element;
}

function button(element: HTMLElement, label: string): HTMLButtonElement {
  const match = [...element.querySelectorAll('button')].find((each) => each.textContent.trim() === label);
  if (match === undefined) {
    throw new Error(`No button labelled ${label}`);
  }
  return match;
}

describe('SettingsPage', () => {
  it('shows the current choices: language, rules language and distances', async () => {
    const { harness } = await render(true);
    const page = root(harness);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('Rules language');
    });
    expect(page.textContent).toContain('English');
    expect(button(page, 'Feet').getAttribute('aria-pressed')).toBe('true');
  });

  it('saves a new distance unit to the account', async () => {
    const { harness, update } = await render(true);
    const page = root(harness);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('Distances');
    });
    button(page, 'Metres').click();
    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith({ distanceUnit: DistanceUnit.Metres });
    });
  });

  it('says so inline when the account cannot save', async () => {
    const { harness } = await render(true, false);
    const page = root(harness);
    await vi.waitFor(() => {
      expect(page.textContent).toContain('Distances');
    });
    button(page, 'Metres').click();
    await vi.waitFor(() => {
      expect(page.querySelector('fr-segmented-field')?.textContent).toContain('Could not save that to your account.');
    });
    expect([...page.querySelectorAll('fr-select-field')].map((field) => field.textContent)).not.toContain(
      expect.stringContaining('Could not save'),
    );
  });

  it('saves the UI language and the rules language as their own preferences', async () => {
    const { harness, update } = await render(true);
    await vi.waitFor(() => {
      expect(root(harness).textContent).toContain('Rules language');
    });
    const [ui, content] = harness.fixture.debugElement.queryAll(
      (each) => each.componentInstance instanceof SelectField,
    );
    // English is the only locale, so no pick in the DOM changes the value; fire each field's output instead.
    ui?.triggerEventHandler('valueChange', Locale.English);
    content?.triggerEventHandler('valueChange', Locale.English);

    await vi.waitFor(() => {
      expect(update.mock.calls).toStrictEqual([[{ uiLocale: Locale.English }], [{ contentLocale: Locale.English }]]);
    });
  });

  it('sends signed-out visitors to sign in instead', async () => {
    const { harness } = await render(false);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/account/sign-in?returnTo=%2Faccount%2Fsettings');
  });
});
