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
}

async function open(url: string): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'content', children: contentRoutes }]),
      provideI18n({ en: async () => frontierMessages }),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      ...provideContentTesting(new TestContentDelivery([BROWSE_LOADER])),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  return { root: present(harness.routeNativeElement), harness };
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
});
