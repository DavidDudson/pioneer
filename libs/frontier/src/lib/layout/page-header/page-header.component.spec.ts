import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { element, part, renderProjected } from '../../testing/render-projected';
import { PageHeader } from './page-header.component';

const slots = (): HTMLElement[] => [
  element('nav', 'Characters', 'frPageBreadcrumbs'),
  element('button', 'Add character', 'frPageActions'),
  element('div', 'Plan', 'frPageTabs'),
];

describe(PageHeader, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('titles the page with its only h1', async () => {
    const root = await renderProjected(PageHeader, { title: 'Characters' }, []);
    const headings = [...root.querySelectorAll('h1')];
    expect(headings.map((heading) => heading.textContent.trim())).toStrictEqual(['Characters']);
    expect(headings.map((heading) => heading.hasAttribute('aria-busy'))).toStrictEqual([false]);
  });

  it('shows a busy skeleton heading while the title is loading', async () => {
    const root = await renderProjected(PageHeader, { title: undefined }, []);
    expect(part(root, 'h1').getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('h1 fr-skeleton')).not.toBeNull();
  });

  it('describes the page under the title only when given a description', async () => {
    const plain = await renderProjected(PageHeader, { title: 'Characters' }, []);
    expect(plain.querySelector('p')).toBeNull();
    const described = await renderProjected(
      PageHeader,
      { title: 'Characters', description: 'Everyone in this campaign' },
      [],
    );
    expect(part(described, 'p').textContent.trim()).toBe('Everyone in this campaign');
  });

  it('projects breadcrumbs above the title, actions beside it and tabs below it', async () => {
    const root = await renderProjected(PageHeader, { title: 'Characters' }, slots());
    const order = ['nav', 'h1', 'button', '[frPageTabs]'].map((selector) =>
      [...root.querySelectorAll('*')].indexOf(part(root, selector)),
    );
    expect(order).toStrictEqual(order.toSorted((first, second) => first - second));
    expect(part(root, 'button').textContent).toBe('Add character');
  });
});
