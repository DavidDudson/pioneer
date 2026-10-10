import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, onTestFinished } from 'vitest';

import { TextVariant } from '../../text/text.variants';
import { Link } from './link.component';

/** Renders `fr-link` with "Valeros" projected and returns its anchor. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLAnchorElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
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
  const anchor = (link.location.nativeElement as HTMLElement).querySelector('a');
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
});
