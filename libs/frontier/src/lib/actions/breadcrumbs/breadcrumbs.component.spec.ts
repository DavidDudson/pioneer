import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { renderProjected } from '../../testing/render-projected';
import { Breadcrumbs } from './breadcrumbs.component';
import type { BreadcrumbItem } from './breadcrumbs.component';

const PATH: readonly BreadcrumbItem[] = [
  { label: 'Content Browser', to: '/content' },
  { label: 'Spells', to: '/content/spells' },
  { label: 'Fireball' },
];

const render = async (items: readonly BreadcrumbItem[] = PATH): Promise<HTMLElement> =>
  renderProjected(Breadcrumbs, { label: 'Breadcrumb', items }, []);

describe(Breadcrumbs, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideFrontierI18nTesting()] });
  });

  it('is a labelled navigation landmark holding an ordered list', async () => {
    const root = await render();
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(root.querySelectorAll('nav > ol > li')).toHaveLength(3);
  });

  it('is named Breadcrumb unless given a label', async () => {
    const root = await renderProjected(Breadcrumbs, { items: PATH }, []);
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('links every item but the last, in path order', async () => {
    const root = await render();
    const links = [...root.querySelectorAll('a')].map((link) => [link.textContent.trim(), link.getAttribute('href')]);
    expect(links).toStrictEqual([
      ['Content Browser', '/content'],
      ['Spells', '/content/spells'],
    ]);
  });

  it('marks the last item as the current page, not a link', async () => {
    const root = await render();
    const current = [...root.querySelectorAll('[aria-current="page"]')];
    expect(current.map((item) => [item.tagName, item.textContent.trim()])).toStrictEqual([['SPAN', 'Fireball']]);
  });

  it('shows an item without a target as plain text', async () => {
    const root = await render([{ label: 'Content Browser' }, { label: 'Fireball' }]);
    expect(root.querySelectorAll('a')).toHaveLength(0);
    expect(root.querySelector('li')?.textContent.trim()).toBe('Content Browser');
  });

  it('puts a decorative separator before every item but the first', async () => {
    const root = await render();
    const separated = [...root.querySelectorAll('li')].map((item) => item.querySelector('fr-icon') !== null);
    expect(separated).toStrictEqual([false, true, true]);
  });

  it('never wraps and lets only the middle items shrink', async () => {
    const root = await render();
    expect(root.querySelector('ol')?.classList.contains('flex-nowrap')).toBe(true);
    const shrinks = [...root.querySelectorAll('li')].map((item) => item.classList.contains('shrink'));
    expect(shrinks).toStrictEqual([false, true, false]);
  });

  it('renders a single item as the current page', async () => {
    const root = await render([{ label: 'Content Browser' }]);
    expect(root.querySelector('[aria-current="page"]')?.textContent.trim()).toBe('Content Browser');
  });
});
