import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages, HeaderCrumbs } from '@pioneer/frontier';
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

/** The entry's heading, once the entry has loaded. */
async function headed(root: HTMLElement): Promise<string> {
  await vi.waitFor(() => {
    expect(root.querySelector('pio-entry-preview h2')).not.toBeNull();
  });
  return present(root.querySelector('pio-entry-preview h2')).textContent.trim();
}

const linkNamed = (root: HTMLElement, name: string): HTMLAnchorElement | undefined =>
  [...root.querySelectorAll<HTMLAnchorElement>('pio-entry-preview a')].find((each) => each.textContent.trim() === name);

const backToOrigin = (root: HTMLElement): HTMLButtonElement | undefined =>
  [...root.querySelectorAll('button')].find((each) => each.textContent.trim() === 'Back to where you were');

describe('EntryPage', () => {
  beforeAll(async () => {
    await prebuildContentTesting([BROWSE_LOADER]);
  }, 60_000);

  it('shows an entry from its link, without an account', async () => {
    const { root } = await open('/content/feat/shield-block');
    await expect(headed(root)).resolves.toBe('Shield-block');
    // The heading shows before the body does.
    await vi.waitFor(() => {
      expect(present(root.querySelector('pio-entry-preview')).textContent).toContain('Raise a shield');
    });
    const card = present(root.querySelector('pio-entry-preview')).textContent;
    expect(card).toContain('Level 1');
    expect(card).toContain('fighter');
  });

  it('shows a creature as its stat block', async () => {
    const { root } = await open('/content/creature/giant-rat');
    await vi.waitFor(() => {
      expect(root.querySelector('pio-creature-stat-block')).not.toBeNull();
    });
    const card = present(root.querySelector('pio-creature-stat-block')).textContent;
    expect(card).toContain('Giant Rat');
    expect(card).toContain('Creature -1');
    expect(card).toContain('Melee jaws +7');
  });

  it('links a reference to the entry it names, and shows the label of one it cannot find', async () => {
    const { root } = await open('/content/feat/shield-block');
    await headed(root);
    await vi.waitFor(() => {
      expect(linkNamed(root, 'Power-attack')?.getAttribute('href')).toBe('/content/feat/power-attack');
    });
    expect(linkNamed(root, 'Mystery Feat')).toBeUndefined();
    expect(present(root.querySelector('pio-entry-preview')).textContent).toContain('Mystery Feat');
  });

  it('opens the entry a reference links to', async () => {
    const { root, harness } = await open('/content/feat/shield-block');
    await headed(root);
    await vi.waitFor(() => {
      expect(linkNamed(root, 'Power-attack')).toBeDefined();
    });
    present(linkNamed(root, 'Power-attack')).click();
    await vi.waitFor(() => {
      expect(harness.routeNativeElement?.querySelector('pio-entry-preview h2')?.textContent.trim()).toBe(
        'Power-attack',
      );
    });
  });

  it('keeps the kind and words in the way back to the content list', async () => {
    const { root } = await open('/content/feat/shield-block?kind=feat&q=shield');
    await headed(root);
    const back = [...root.querySelectorAll('a')].find((each) => each.textContent.trim() === 'Back to the content list');
    expect(back?.getAttribute('href')).toBe('/content?kind=feat&q=shield');
  });

  it('offers the way back to the page it was opened from, and only then', async () => {
    const { root, harness } = await open('/content/feat/shield-block');
    await headed(root);
    expect(backToOrigin(root)).toBeUndefined();

    // A new page, as following the panel's link makes.
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/content');
    await router.navigateByUrl('/content/feat/power-attack', { state: { origin: '/content?kind=spell&drawer=open' } });
    await vi.waitFor(() => {
      expect(backToOrigin(present(harness.routeNativeElement))).toBeDefined();
    });
    present(backToOrigin(present(harness.routeNativeElement))).click();
    await vi.waitFor(() => {
      expect(router.url).toBe('/content?kind=spell&drawer=open');
    });
  });

  it('shows the trail from the content browser through the kind to the entry, from the routes', async () => {
    const { root } = await open('/content/feat/shield-block');
    await headed(root);
    const crumbs = TestBed.inject(HeaderCrumbs);
    await vi.waitFor(() => {
      expect(crumbs.trail().map(({ label }) => label)).toStrictEqual(['Content Browser', 'Feats', 'Shield-block']);
    });
    const hrefs = crumbs
      .trail()
      .slice(0, -1)
      .map(({ to }) => to);
    expect(hrefs).toStrictEqual(['/content', '/content/feat']);
  });

  it('opens the browser on the kind when the kind crumb is followed', async () => {
    await open('/content/feat');
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/content?kind=feat');
    });
  });

  it.each(['/content/feat/no-such-feat', '/content/not-a-kind/power-attack'])(
    'says so when %s names no entry',
    async (url) => {
      const { root } = await open(url);
      await vi.waitFor(() => {
        expect(root.querySelector('fr-empty-state')?.textContent).toContain('No such entry');
      });
    },
  );
});
