import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { prebuildContentTesting, provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { contentRoutes } from '../content.routes';
import { BROWSE_LOADER } from '../testing/browse-fixtures';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

interface Opened {
  readonly root: HTMLElement;
  readonly harness: RouterTestingHarness;
  readonly delivery: TestContentDelivery;
}

async function open(url: string): Promise<Opened> {
  const delivery = new TestContentDelivery([BROWSE_LOADER]);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'content', children: contentRoutes }]),
      provideI18n({ en: async () => frontierMessages }),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      ...provideContentTesting(delivery),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  return { root: present(harness.routeNativeElement), harness, delivery };
}

/** The names in the table's first column, in order; empty while the entries load. */
const listed = (root: HTMLElement): string[] =>
  [...root.querySelectorAll('fr-table tbody tr')].map((row) => present(row.querySelector('td')).textContent.trim());

/** The list once it has loaded and holds `count` entries. */
async function loaded(root: HTMLElement, count: number): Promise<string[]> {
  await vi.waitFor(() => {
    expect(listed(root)).toHaveLength(count);
  });
  return listed(root);
}

/** The chip whose label starts with `label`, in the filters or the kinds. */
const chip = (root: HTMLElement, label: string): HTMLElement =>
  present(
    [...root.querySelectorAll<HTMLElement>('button[aria-pressed]')].find((each) =>
      each.textContent.trim().startsWith(label),
    ),
  );

describe('ContentBrowserPage', () => {
  beforeAll(async () => {
    await prebuildContentTesting([BROWSE_LOADER]);
  }, 60_000);

  it('opens on feats, by name, without an account', async () => {
    const { root } = await open('/content');
    await expect(loaded(root, 4)).resolves.toStrictEqual([
      'Incredible-initiative',
      'Power-attack',
      'Shield-block',
      'Toughness',
    ]);
  });

  it('restores a filtered list from its link', async () => {
    const { root } = await open('/content?kind=feat&f.traits=fighter');
    await expect(loaded(root, 2)).resolves.toStrictEqual(['Power-attack', 'Shield-block']);
  });

  it('restores an exclusion and a range from its link', async () => {
    const { root } = await open('/content?kind=feat&f.traits=!fighter&f.level=..1');
    await expect(loaded(root, 1)).resolves.toStrictEqual(['Toughness']);
  });

  it('writes a picked value to the link and shows how many entries it leaves', async () => {
    const { root, harness } = await open('/content');
    await loaded(root, 4);
    chip(root, 'fighter (2)').click();
    await expect(loaded(root, 2)).resolves.toStrictEqual(['Power-attack', 'Shield-block']);
    expect(TestBed.inject(Router).url).toContain('f.traits=fighter');
    harness.fixture.destroy();
  });

  it('lists another kind when it is picked, keeping the filters it shares', async () => {
    const { root } = await open('/content?kind=feat&f.level=..1');
    await loaded(root, 3);
    chip(root, 'Spells').click();
    await expect(loaded(root, 4)).resolves.toContain('Heal');
    expect(TestBed.inject(Router).url).toContain('kind=feat,spell');
  });

  it('keeps a kind picked when it is the last one deselected', async () => {
    const { root } = await open('/content?kind=feat');
    await loaded(root, 4);
    chip(root, 'Feats').click();
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).not.toMatch(/kind=(?:&|$)/u);
    });
    await loaded(root, 4);
    expect(chip(root, 'Feats').getAttribute('aria-pressed')).toBe('true');
  });

  it('says so when no entry matches', async () => {
    const { root } = await open('/content?kind=feat&f.traits=fighter,!fighter&f.level=9..');
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Nothing matches');
    });
  });

  describe('search', () => {
    it('lists what the server found for the words in the link, and keeps them in the search box', async () => {
      const { root } = await open('/content?kind=feat&q=power');
      await expect(loaded(root, 1)).resolves.toStrictEqual(['Power-attack']);
      expect(present(root.querySelector<HTMLInputElement>('fr-search-input input')).value).toBe('power');
    });

    it('applies the filters to the matches', async () => {
      const { root } = await open('/content?kind=feat&q=i&f.traits=fighter');
      await expect(loaded(root, 1)).resolves.toStrictEqual(['Shield-block']);
    });

    it('searches only the kinds picked', async () => {
      const { root } = await open('/content?kind=spell&q=power');
      await vi.waitFor(() => {
        expect(root.textContent).toContain('No entry matches those words');
      });
    });

    it('writes typed words to the link and lists the matches', async () => {
      const { root } = await open('/content?kind=feat');
      await loaded(root, 4);
      const box = present(root.querySelector<HTMLInputElement>('fr-search-input input'));
      box.value = 'tough';
      box.dispatchEvent(new Event('input'));
      box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await expect(loaded(root, 1)).resolves.toStrictEqual(['Toughness']);
      expect(TestBed.inject(Router).url).toContain('q=tough');
    });

    it('lists everything again when the words are cleared', async () => {
      const { root } = await open('/content?kind=feat&q=tough');
      await loaded(root, 1);
      present(root.querySelector<HTMLElement>('fr-search-input button')).click();
      await expect(loaded(root, 4)).resolves.toHaveLength(4);
      expect(TestBed.inject(Router).url).not.toContain('q=');
    });

    it('says the search failed when the server cannot be reached', async () => {
      const { root, delivery } = await open('/content?kind=feat');
      await loaded(root, 4);
      delivery.offline = true;
      await TestBed.inject(Router).navigateByUrl('/content?kind=feat&q=power');
      await vi.waitFor(() => {
        expect(root.textContent).toContain('The search could not be completed');
      });
    });
  });
});
