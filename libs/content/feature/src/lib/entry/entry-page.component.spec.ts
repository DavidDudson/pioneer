import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

/** The entry's heading, once the entry has loaded. */
async function headed(root: HTMLElement): Promise<string> {
  await vi.waitFor(() => {
    expect(root.querySelector('pio-entry-preview h2')).not.toBeNull();
  });
  return present(root.querySelector('pio-entry-preview h2')).textContent.trim();
}

const linkNamed = (root: HTMLElement, name: string): HTMLAnchorElement | undefined =>
  [...root.querySelectorAll<HTMLAnchorElement>('pio-entry-preview a')].find((each) => each.textContent.trim() === name);

describe('EntryPage', () => {
  beforeAll(async () => {
    await prebuildContentTesting([BROWSE_LOADER]);
  }, 60_000);

  it('shows an entry from its link, without an account', async () => {
    const { root } = await open('/content/feat/shield-block');
    await expect(headed(root)).resolves.toBe('Shield-block');
    const card = present(root.querySelector('pio-entry-preview')).textContent;
    expect(card).toContain('Level 1');
    expect(card).toContain('fighter');
    expect(card).toContain('Raise a shield');
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
