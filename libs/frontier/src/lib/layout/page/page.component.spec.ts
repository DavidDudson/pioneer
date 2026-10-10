import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { projectBySelector } from '../../testing/project-by-selector';
import { Page } from './page.component';

interface Rendered {
  readonly header: HTMLElement;
  readonly main: HTMLElement;
  readonly box: Element;
}

/** Renders `fr-page` with an "Add character" action and a "Character list" paragraph projected. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<Rendered> {
  const action = document.createElement('button');
  action.setAttribute('frPageActions', '');
  action.textContent = 'Add character';
  const content = document.createElement('p');
  content.textContent = 'Character list';
  const page = createComponent(Page, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: projectBySelector(Page, [action, content]),
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
  const main = host.querySelector('main');
  const box = host.querySelector('fr-box');
  if (header === null || main === null || box === null) {
    throw new Error('fr-page rendered no box, header or main landmark');
  }
  return { header, main, box };
}

describe(Page, () => {
  it('titles the page with its only h1, in the header', async () => {
    const { header, main } = await render({ title: 'Characters' });
    const headings = [...header.querySelectorAll('h1')];
    expect(headings.map((heading) => heading.textContent.trim())).toStrictEqual(['Characters']);
    expect(headings.map((heading) => heading.hasAttribute('aria-busy'))).toStrictEqual([false]);
    expect(main.querySelector('h1')).toBeNull();
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

  it('projects frPageActions into the header and other content into main', async () => {
    const { header, main } = await render({ title: 'Characters' });
    expect(header.querySelector('button')?.textContent).toBe('Add character');
    expect(main.querySelector('button')).toBeNull();
    expect(main.textContent.trim()).toBe('Character list');
  });

  it('sits in a page-width box with a gutter', async () => {
    const { box } = await render({ title: 'Characters' });
    expect([...box.classList]).toContain('max-w-page');
    expect(box.querySelector(':scope > .p-lg.px-md')).not.toBeNull();
  });
});
