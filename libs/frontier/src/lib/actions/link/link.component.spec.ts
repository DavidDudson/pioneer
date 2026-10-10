import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, onTestFinished } from 'vitest';

import { TextVariant } from '../../text/text.variants';
import { Link } from './link.component';

/** Renders `fr-link` with "Valeros" projected, with the app at `url`, and returns its host. */
async function renderHost(inputs: Readonly<Record<string, unknown>>, url = '/'): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
  const navigated = await TestBed.inject(Router).navigateByUrl(url);
  expect(navigated).toBe(true);
  const link = createComponent(Link, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('Valeros')]],
  });
  onTestFinished(() => {
    link.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    link.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(link.hostView);
  await appRef.whenStable();
  return link.location.nativeElement as HTMLElement;
}

/** Renders `fr-link` with "Valeros" projected, with the app at `url`, and returns its anchor. */
async function render(inputs: Readonly<Record<string, unknown>>, url?: string): Promise<HTMLAnchorElement> {
  const host = await renderHost(inputs, url);
  const anchor = host.querySelector('a');
  if (anchor === null) {
    throw new Error('fr-link rendered no <a>');
  }
  return anchor;
}

describe(Link, () => {
  it('navigates in the app through the router', async () => {
    const anchor = await render({ to: ['/characters', 'valeros'] });
    expect(anchor.getAttribute('href')).toBe('/characters/valeros');
    expect(anchor.hasAttribute('rel')).toBe(false);
    expect(anchor.textContent.trim()).toBe('Valeros');
  });

  it('opens another site with rel="noopener"', async () => {
    const anchor = await render({ href: 'https://paizo.com' });
    expect(anchor.getAttribute('href')).toBe('https://paizo.com');
    expect(anchor.getAttribute('rel')).toBe('noopener');
  });

  it.each(['https://angular.dev/guide', 'HTTP://example.com/x'])(
    'links an external URL from data (%j) to the other site with rel="noopener"',
    async (url) => {
      const anchor = await render({ external: url });
      expect(anchor.getAttribute('href')).toBe(url);
      expect(anchor.getAttribute('rel')).toBe('noopener');
    },
  );

  it.each([
    '/characters',
    'https:/characters',
    'https:characters',
    // oxlint-disable-next-line no-script-url -- the input fr-link must refuse, never code that runs
    'javascript:alert(1)',
    'data:text/html,hi',
    '',
  ])('shows an external URL that would not leave the app (%j) as plain text', async (url) => {
    const host = await renderHost({ external: url });
    expect(host.querySelector('a')).toBeNull();
    expect(host.textContent.trim()).toBe('Valeros');
  });

  it('names the link with its aria label', async () => {
    const anchor = await render({ external: 'https://angular.dev', ariaLabel: 'Valeros: Angular documentation' });
    expect(anchor.getAttribute('aria-label')).toBe('Valeros: Angular documentation');
  });

  it('has no aria label unless given one', async () => {
    const anchor = await render({ to: '/' });
    expect(anchor.hasAttribute('aria-label')).toBe(false);
  });

  it('underlines in the accent and shows focus', async () => {
    const anchor = await render({ to: '/' });
    expect([...anchor.classList]).toStrictEqual(
      expect.arrayContaining(['text-accent-fg', 'underline', 'focus-visible:focus-ring']),
    );
  });

  it('inherits the typography of the text around it without a variant', async () => {
    const anchor = await render({ to: '/' });
    expect([...anchor.classList]).not.toContain('text-body');
  });

  it('takes the typography of its variant when it stands alone', async () => {
    const anchor = await render({ to: '/', variant: TextVariant.Subheading });
    expect([...anchor.classList]).toStrictEqual(expect.arrayContaining(['text-subheading', 'font-semibold']));
  });

  it('marks a link to the page being shown as the current page', async () => {
    const anchor = await render({ to: '/characters' }, '/characters');
    expect(anchor.getAttribute('aria-current')).toBe('page');
    expect([...anchor.classList]).toStrictEqual(expect.arrayContaining(['decoration-accent-fg', 'underline-current']));
  });

  it('marks a link as current on the pages under it', async () => {
    const anchor = await render({ to: '/characters' }, '/characters/valeros');
    expect(anchor.getAttribute('aria-current')).toBe('page');
  });

  it('leaves a link to another page unmarked', async () => {
    const anchor = await render({ to: '/campaigns' }, '/characters');
    expect(anchor.hasAttribute('aria-current')).toBe(false);
    expect([...anchor.classList]).not.toContain('underline-current');
  });

  it.each([
    ['/', true],
    ['/characters', false],
  ])('marks an exact link to "/" as current at %j: %j', async (url, current) => {
    const anchor = await render({ to: '/', exact: true }, url);
    expect(anchor.getAttribute('aria-current') === 'page').toBe(current);
  });

  it('follows navigation away from the current page', async () => {
    const anchor = await render({ to: '/characters' }, '/characters');
    const navigated = await TestBed.inject(Router).navigateByUrl('/campaigns');
    expect(navigated).toBe(true);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(anchor.hasAttribute('aria-current')).toBe(false);
    expect([...anchor.classList]).not.toContain('underline-current');
  });
});
