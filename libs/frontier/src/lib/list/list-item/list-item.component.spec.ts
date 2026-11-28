import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { element, part, renderProjected } from '../../testing/render-projected';
import { ItemActions } from '../item/item-actions.component';
import { ItemContent } from '../item/item-content.component';
import { ItemMedia } from '../item/item-media.component';
import { ListItem } from './list-item.component';

describe(ListItem, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('is a list item with no padding or rule by default', async () => {
    const root = await renderProjected(ListItem, {}, []);
    expect(root.getAttribute('role')).toBe('listitem');
    expect([...root.classList]).toStrictEqual(['list-item', 'p-none']);
  });

  it('takes the padding token and rules itself off from the next row', async () => {
    const root = await renderProjected(ListItem, { padding: 'md', divided: true }, []);
    expect([...root.classList]).toStrictEqual(
      expect.arrayContaining(['p-md', 'not-last:border-b', 'not-last:border-line-subtle']),
    );
  });

  it('lays media, content, other children and actions out in that order', async () => {
    const root = await renderProjected(ListItem, {}, [
      element('fr-item-actions', 'actions'),
      element('span', 'badge'),
      element('fr-item-content', 'content'),
      element('fr-item-media', 'media'),
    ]);

    const order = ['fr-item-media', 'fr-item-content', 'span', 'fr-item-actions'].map((selector) =>
      [...root.querySelectorAll('*')].indexOf(part(root, selector)),
    );

    expect(order).toStrictEqual(order.toSorted((first, second) => first - second));
  });
});

describe(ItemContent, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('shows the heading and byline, then the projected detail', async () => {
    const root = await renderProjected(ItemContent, { heading: 'Valeros', byline: 'Fighter' }, [
      element('span', 'badge'),
    ]);

    expect(root.textContent.trim()).toBe('ValerosFighterbadge');
  });

  it('leaves out a byline it was not given', async () => {
    const root = await renderProjected(ItemContent, { heading: 'Valeros' }, []);
    expect(root.querySelectorAll('fr-text')).toHaveLength(1);
  });

  it('shows two skeleton lines while loading, and none of the text', async () => {
    const root = await renderProjected(ItemContent, { heading: 'Valeros', loading: true }, []);
    expect([root.querySelectorAll('fr-skeleton').length, root.textContent.trim()]).toStrictEqual([2, '']);
  });
});

describe('item parts', () => {
  it.each([[ItemMedia], [ItemActions]])('%s keeps its size in the row', async (type) => {
    const root = await renderProjected(type, {}, []);
    expect([...root.classList]).toContain('shrink-0');
  });
});
