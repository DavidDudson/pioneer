import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Tone } from '../../tokens';
import { TextVariant } from '../text.variants';
import { Heading, HeadingLevel } from './heading.component';

/** Renders `fr-heading` with "Identity" projected and returns the heading element it renders. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
  const heading = createComponent(Heading, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('Identity')]],
  });
  onTestFinished(() => {
    heading.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    heading.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(heading.hostView);
  await appRef.whenStable();
  const rendered = (heading.location.nativeElement as HTMLElement).firstElementChild;
  if (!(rendered instanceof HTMLElement)) {
    throw new Error('fr-heading rendered no element');
  }
  return rendered;
}

describe(Heading, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it.each([
    [HeadingLevel.One, 'H1', 'text-title'],
    [HeadingLevel.Two, 'H2', 'text-heading'],
    [HeadingLevel.Three, 'H3', 'text-subheading'],
    [HeadingLevel.Four, 'H4', 'text-label'],
  ])('renders level %i as <%s> styled %s', async (level, tag, size) => {
    const rendered = await render({ level });
    expect(rendered.tagName).toBe(tag);
    expect([...rendered.classList]).toStrictEqual(expect.arrayContaining([size, 'text-fg-default']));
    expect(rendered.textContent.trim()).toBe('Identity');
  });

  it('changes the look with a variant but keeps the heading level', async () => {
    const rendered = await render({ level: HeadingLevel.Two, variant: TextVariant.Subheading });
    expect(rendered.tagName).toBe('H2');
    expect([...rendered.classList]).toContain('text-subheading');
    expect([...rendered.classList]).not.toContain('text-heading');
  });

  it('takes a tone and truncates when asked', async () => {
    const rendered = await render({ level: HeadingLevel.Three, tone: Tone.Muted, truncate: true });
    expect([...rendered.classList]).toStrictEqual(expect.arrayContaining(['text-fg-muted', 'truncate']));
  });

  it('is marked busy only while its text is loading', async () => {
    const loaded = await render({ level: HeadingLevel.One });
    expect(loaded.hasAttribute('aria-busy')).toBe(false);
    expect(loaded.querySelector('.sr-only')).toBeNull();
    const loading = await render({ level: HeadingLevel.One, busy: true });
    expect(loading.getAttribute('aria-busy')).toBe('true');
  });

  it('is named "Loading" while busy, so a heading holding only a skeleton is never empty', async () => {
    const loading = await render({ level: HeadingLevel.One, busy: true });
    expect(loading.querySelector('.sr-only')?.textContent).toBe('Loading');
  });
});
