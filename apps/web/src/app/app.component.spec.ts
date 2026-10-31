import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ColorMode, Theme, ThemeChoice, ThemeStore } from '@pioneer/frontier';
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

/** Opens the dropdown whose trigger is named `label` (once the server has answered), and returns the trigger. */
async function openMenu(root: HTMLElement, label: string): Promise<HTMLButtonElement> {
  const selector = `button[aria-label="${label}"]`;
  await vi.waitFor(() => {
    expect(root.querySelector(selector)).not.toBeNull();
  });
  const trigger = root.querySelector<HTMLButtonElement>(selector);
  if (trigger === null) {
    throw new Error(`No menu trigger named ${label}`);
  }
  trigger.click();
  return trigger;
}

/** The open account dropdown's panel, which the overlay puts outside the app's root. */
function accountPanel(): HTMLElement {
  const panel = document.querySelector<HTMLElement>('[role="group"][aria-label="Account menu"]');
  if (panel === null) {
    throw new Error('The account menu is closed');
  }
  return panel;
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

  it('shows the brand with its Pre-Alpha badge in one header row', async () => {
    const fixture = await renderShell();
    const header = (fixture.nativeElement as HTMLElement).querySelector('header');
    expect(header?.textContent).toContain('Pioneer');
    expect(header?.textContent).toContain('Pre-Alpha');
  });

  it('lists the site sections in an icon-only dropdown', async () => {
    const fixture = await renderShell();
    const trigger = await openMenu(fixture.nativeElement as HTMLElement, 'Sections');
    expect(trigger.textContent.trim()).toBe('');
    await fixture.whenStable();
    const links = [...document.querySelectorAll('[role="group"][aria-label="Sections"] a')];
    expect(links.map((link) => link.textContent.trim())).toStrictEqual([
      'Characters',
      'Content',
      'Homebrew',
      'Campaigns',
      'Dice',
      'Rules',
    ]);
  });

  it('offers sign-in, theme and dark mode, and no settings, when signed out', async () => {
    const fixture = await renderShell();
    const element = await answerMe(fixture, 401, {
      type: 'unauthorized',
      title: 'Unauthorized',
      status: 401,
      message: { key: 'problem.unauthorized' },
    });
    await openMenu(element, 'Account menu');
    await fixture.whenStable();
    const panel = accountPanel();
    expect(buttonLabels(panel)).toContain('Sign in');
    expect(panel.querySelector('a[href="/account/settings"]')).toBeNull();
    expect(panel.querySelector('[aria-label="Dark mode"]')).not.toBeNull();
  });

  it('shows who is signed in, with their settings and sign-out', async () => {
    const fixture = await renderShell();
    const element = await answerMe(fixture, 200, {
      id: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
      displayName: 'Amiri',
      emailVerified: false,
      createdAt: '2026-10-09T08:00:00.000Z',
      updatedAt: '2026-10-09T08:00:00.000Z',
    });
    await vi.waitFor(() => {
      expect(element.querySelector('[aria-label="Account menu"]')).not.toBeNull();
    });
    await openMenu(element, 'Account menu');
    await fixture.whenStable();
    const panel = accountPanel();
    expect(panel.querySelector('a[href="/account"]')?.textContent).toContain('Amiri');
    expect(panel.querySelector('a[href="/account/settings"]')?.textContent.trim()).toBe('Settings');
    expect(panel.querySelector('a[href="/account/report-bug"]')).not.toBeNull();
    expect(buttonLabels(panel)).toContain('Sign out');
    expect(buttonLabels(panel)).not.toContain('Sign in');
  });

  it('picks the colour mode from three icon-only buttons', async () => {
    const fixture = await renderShell();
    const element = await answerMe(fixture, 401, { type: 'unauthorized', title: 'Unauthorized', status: 401 });
    await openMenu(element, 'Account menu');
    await fixture.whenStable();
    const options = [...accountPanel().querySelectorAll<HTMLButtonElement>('[aria-label="Dark mode"] button')];
    expect(options.map((option) => option.getAttribute('aria-label'))).toStrictEqual(['System', 'Dark', 'Light']);
    expect(options.map((option) => option.textContent.trim())).toStrictEqual(['', '', '']);
    expect(options.map((option) => option.getAttribute('aria-pressed'))).toStrictEqual(['false', 'true', 'false']);

    options[2]?.click();
    await fixture.whenStable();
    expect(TestBed.inject(ThemeStore).mode()).toBe(ColorMode.Light);
    expect(options[2]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('picks the theme from a dropdown whose default is dynamic', async () => {
    const fixture = await renderShell();
    const element = await answerMe(fixture, 401, { type: 'unauthorized', title: 'Unauthorized', status: 401 });
    const store = TestBed.inject(ThemeStore);
    expect(store.choice()).toBe(ThemeChoice.Dynamic);
    expect(store.theme()).toBe(Theme.Frontier);

    await openMenu(element, 'Account menu');
    await fixture.whenStable();
    const trigger = accountPanel().querySelector<HTMLButtonElement>('button[aria-label="Theme"]');
    expect(trigger?.textContent.trim()).toBe('Dynamic');
    trigger?.click();
    await fixture.whenStable();
    const options = [...document.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="Theme"] button')];
    expect(options.map((option) => option.textContent.trim())).toStrictEqual(['Dynamic', 'Frontier', 'Tavern']);

    options[2]?.click();
    await fixture.whenStable();
    expect(store.theme()).toBe(Theme.Tavern);
  });

  it('follows the open page theme while dynamic', async () => {
    await renderShell();
    const store = TestBed.inject(ThemeStore);
    store.context.set(Theme.Tavern);
    expect(store.theme()).toBe(Theme.Tavern);
  });
});
