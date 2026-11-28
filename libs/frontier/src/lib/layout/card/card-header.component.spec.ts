import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { element, part, renderProjected } from '../../testing/render-projected';
import { CardHeader } from './card-header.component';

describe(CardHeader, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('titles with a level 2 heading by default and a level the caller picks otherwise', async () => {
    const byDefault = await renderProjected(CardHeader, { heading: 'Notes' }, []);
    const deeper = await renderProjected(CardHeader, { heading: 'Notes', level: 3 }, []);
    expect([part(byDefault, 'h2').textContent.trim(), part(deeper, 'h3').textContent.trim()]).toStrictEqual([
      'Notes',
      'Notes',
    ]);
  });

  it('describes the heading only when given a description', async () => {
    const plain = await renderProjected(CardHeader, { heading: 'Notes' }, []);
    const described = await renderProjected(CardHeader, { heading: 'Notes', description: 'Visible to the GM' }, []);
    expect([plain.querySelector('p') === null, part(described, 'p').textContent.trim()]).toStrictEqual([
      true,
      'Visible to the GM',
    ]);
  });

  it('shows a busy skeleton heading while the title is loading', async () => {
    const root = await renderProjected(CardHeader, { heading: undefined }, []);
    expect(part(root, 'h2').getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('h2 fr-skeleton')).not.toBeNull();
  });

  it('gives the heading its anchor id', async () => {
    const root = await renderProjected(CardHeader, { heading: 'Notes', anchor: 'notes' }, []);
    expect(part(root, 'h2').id).toBe('notes');
  });

  it('projects actions after the heading', async () => {
    const root = await renderProjected(CardHeader, { heading: 'Notes' }, [element('button', 'Edit', 'data-part')]);
    const order = ['h2', 'button'].map((selector) => [...root.querySelectorAll('*')].indexOf(part(root, selector)));
    expect(order).toStrictEqual(order.toSorted((first, second) => first - second));
  });
});
