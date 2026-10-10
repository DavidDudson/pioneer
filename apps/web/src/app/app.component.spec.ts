import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ColorMode, Theme, ThemeStore } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './app.component';
import { appMessages } from './messages';

async function renderShell(): Promise<ComponentFixture<App>> {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([]),
      provideI18n(appMessages),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return fixture;
}

/** Answers the shell's `/api/me` and waits for the account slot to render. */
async function answerMe(fixture: ComponentFixture<App>, status: number, body: object): Promise<HTMLElement> {
  TestBed.inject(HttpTestingController)
    .expectOne('/api/me')
    .flush(body, { status, statusText: String(status) });
  await TestBed.inject(ApplicationRef).whenStable();
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Labels of the shell's buttons. */
function buttonLabels(element: HTMLElement): string[] {
  return [...element.querySelectorAll('button')].map((button) => button.textContent.trim());
}

describe(App, () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders the shell with the Community Use notice', async () => {
    const fixture = await renderShell();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Pioneer');
    expect(element.textContent).toContain("Paizo's Community Use Policy");
  });

  it('links the public Legal page from the footer', async () => {
    const fixture = await renderShell();
    const element = fixture.nativeElement as HTMLElement;
    const legal = element.querySelector('footer a[href="/legal"]');
    expect(legal?.textContent.trim()).toBe('Legal');
  });

  it('picks the theme from a segmented control', async () => {
    const fixture = await renderShell();
    const element = fixture.nativeElement as HTMLElement;
    const options = [...element.querySelectorAll<HTMLButtonElement>('fr-segmented [aria-label="Theme"] button')];
    expect(options.map((option) => option.textContent.trim())).toStrictEqual(['Frontier', 'Tavern']);
    expect(options.map((option) => option.getAttribute('aria-pressed'))).toStrictEqual(['true', 'false']);

    options[1]?.click();
    await fixture.whenStable();
    expect(TestBed.inject(ThemeStore).theme()).toBe(Theme.Tavern);
    expect(options[1]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches dark mode with a toggle whose label stays the same', async () => {
    const fixture = await renderShell();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('fr-toggle-button button');
    expect(toggle?.textContent.trim()).toBe('Dark mode');
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');

    toggle?.click();
    await fixture.whenStable();
    expect(TestBed.inject(ThemeStore).mode()).toBe(ColorMode.Light);
    expect(toggle?.getAttribute('aria-pressed')).toBe('false');
    expect(toggle?.textContent.trim()).toBe('Dark mode');
  });

  it('offers sign-in, and no settings, when signed out', async () => {
    const element = await answerMe(await renderShell(), 401, {
      type: 'unauthorized',
      title: 'Unauthorized',
      status: 401,
      message: { key: 'problem.unauthorized' },
    });
    await vi.waitFor(() => {
      expect(buttonLabels(element)).toContain('Sign in');
    });
    expect(element.querySelector('a[href="/account/settings"]')).toBeNull();
  });

  it('shows who is signed in, with their settings and sign-out', async () => {
    const element = await answerMe(await renderShell(), 200, {
      id: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
      displayName: 'Amiri',
      emailVerified: false,
      createdAt: '2026-10-09T08:00:00.000Z',
      updatedAt: '2026-10-09T08:00:00.000Z',
    });
    await vi.waitFor(() => {
      expect(element.textContent).toContain('Amiri');
    });
    expect(element.querySelector('a[href="/account"]')?.textContent.trim()).toBe('Amiri');
    expect(element.querySelector('a[href="/account/settings"]')?.textContent.trim()).toBe('Settings');
    expect(buttonLabels(element)).toContain('Sign out');
    expect(buttonLabels(element)).not.toContain('Sign in');
  });
});
