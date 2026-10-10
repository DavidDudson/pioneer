import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { SectionIndexHost } from '../../testing/section-index-host';
import type { SectionIndexHostLink } from '../../testing/section-index-host';
import { SectionIndex } from './section-index.component';

const SECTIONS: readonly SectionIndexHostLink[] = [
  { anchor: 'sheet-identity', label: 'Identity' },
  { anchor: 'sheet-attributes', label: 'Attributes' },
  { anchor: 'sheet-defences', label: 'Defences' },
];

/** Renders `fr-section-index` into the document and returns its host. */
async function render(sections: readonly SectionIndexHostLink[]): Promise<HTMLElement> {
  const index = createComponent(SectionIndexHost, { environmentInjector: TestBed.inject(EnvironmentInjector) });
  onTestFinished(() => {
    index.destroy();
  });
  index.setInput('label', 'Sheet sections');
  index.setInput('sections', sections);
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(index.hostView);
  await appRef.whenStable();
  const host = index.location.nativeElement as HTMLElement;
  document.body.append(host);
  return host;
}

/** A focusable heading with `id`, as `fr-section` renders it. */
function target(id: string): HTMLElement {
  const heading = document.createElement('h2');
  heading.id = id;
  heading.tabIndex = -1;
  document.body.append(heading);
  onTestFinished(() => {
    heading.remove();
  });
  return heading;
}

describe(SectionIndex, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('is a labelled navigation landmark', async () => {
    const host = await render(SECTIONS);
    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Sheet sections');
  });

  it('links to every section in page order', async () => {
    const host = await render(SECTIONS);
    const links = [...host.querySelectorAll('a')].map((link) => [link.textContent.trim(), link.getAttribute('href')]);
    expect(links).toStrictEqual([
      ['Identity', '#sheet-identity'],
      ['Attributes', '#sheet-attributes'],
      ['Defences', '#sheet-defences'],
    ]);
  });

  it('moves focus to the section heading without navigating', async () => {
    const host = await render(SECTIONS);
    const heading = target('sheet-attributes');
    const [, link] = host.querySelectorAll('a');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link?.dispatchEvent(click);
    expect([document.activeElement, click.defaultPrevented]).toStrictEqual([heading, true]);
  });
});
