import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { projectBySelector } from '../../testing/project-by-selector';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Page } from './page.component';

interface Rendered {
  readonly header: HTMLElement;
  readonly content: HTMLElement;
  readonly box: Element;
}

/** Renders `fr-page` with an "Add character" action and a "Character list" paragraph projected. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<Rendered> {
  const action = document.createElement('button');
  action.setAttribute('frPageActions', '');
  action.textContent = 'Add character';
  const paragraph = document.createElement('p');
  paragraph.textContent = 'Character list';
  const page = createComponent(Page, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: projectBySelector(Page, [action, paragraph]),
  });
  onTestFinished(() => {
    page.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    page.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(page.hostView);
  await appRef.whenStable();
  const host = page.location.nativeElement as HTMLElement;
  const header = host.querySelector('header');
  const content = header?.nextElementSibling;
  const box = host.querySelector('fr-box');
  if (header === null || !(content instanceof HTMLElement) || box === null) {
    throw new Error('fr-page rendered no box, header or content');
  }
  return { header, content, box };
}

describe(Page, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('titles the page with its only h1, in the header', async () => {
    const { header, content } = await render({ title: 'Characters' });
    const headings = [...header.querySelectorAll('h1')];
    expect(headings.map((heading) => heading.textContent.trim())).toStrictEqual(['Characters']);
    expect(headings.map((heading) => heading.hasAttribute('aria-busy'))).toStrictEqual([false]);
    expect(content.querySelector('h1')).toBeNull();
  });

  it('shows a busy skeleton heading while the title is loading', async () => {
    const { header } = await render({ title: undefined });
    expect(header.querySelector('h1')?.getAttribute('aria-busy')).toBe('true');
    expect(header.querySelector('h1 fr-skeleton')).not.toBeNull();
  });

  it('describes the page under the title only when given a description', async () => {
    const plain = await render({ title: 'Characters' });
    expect(plain.header.querySelector('p')).toBeNull();
    const described = await render({ title: 'Characters', description: 'Everyone in this campaign' });
    expect(described.header.querySelector('p')?.textContent.trim()).toBe('Everyone in this campaign');
  });

  it('projects frPageActions into the header and other content below it', async () => {
    const { header, content } = await render({ title: 'Characters' });
    expect(header.querySelector('button')?.textContent).toBe('Add character');
    expect(content.querySelector('button')).toBeNull();
    expect(content.textContent.trim()).toBe('Character list');
  });

  it('leaves the main landmark to fr-shell', async () => {
    const { header } = await render({ title: 'Characters' });
    expect(header.closest('fr-page')?.querySelector('main')).toBeNull();
  });

  it('sits in a page-width box with a gutter', async () => {
    const { box } = await render({ title: 'Characters' });
    expect([...box.classList]).toContain('max-w-page');
    expect(box.querySelector(':scope > .p-lg.px-md')).not.toBeNull();
  });
});
