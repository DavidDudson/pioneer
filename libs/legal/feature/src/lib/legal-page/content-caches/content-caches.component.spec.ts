import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { legalRoutes } from '../../legal.routes';

const MECHANICS = 'ancestry.mech.0123456789abcdef.json';
const NAMES = 'ancestry.names.en.fedcba9876543210.json';
const PACK_FILE = 'pack.0000000000000001.json';
const manifest = {
  packs: [
    {
      id: 'player-core',
      file: PACK_FILE,
      kinds: [],
      sizes: { [PACK_FILE]: 300, [MECHANICS]: 1_500_000, [NAMES]: 2500 },
    },
    { id: 'core-rules', file: 'pack.0000000000000002.json', kinds: [] },
  ],
};

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

function download(file: string): string {
  return `${location.origin}/api/content/bundles/player-core/${file}`;
}

/** The Legal page, with the manifest request not yet answered. */
async function renderLegalPage(): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'legal', children: legalRoutes }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create('/legal');
  await harness.fixture.whenStable();
  return present(harness.routeNativeElement);
}

function caches(root: HTMLElement): HTMLElement {
  const heading = [...root.querySelectorAll('h2')].find((each) => each.textContent.trim() === 'Content caches');
  return present(heading?.closest<HTMLElement>('fr-surface'));
}

/** Ticks the app until `ready`, since the answered request reaches the query a few tasks later. */
async function until(ready: () => boolean): Promise<void> {
  const app = TestBed.inject(ApplicationRef);
  await vi.waitFor(() => {
    app.tick();
    expect(ready()).toBe(true);
  });
}

async function renderAnswered(): Promise<HTMLElement> {
  const root = await renderLegalPage();
  TestBed.inject(HttpTestingController).expectOne('/api/content/manifest').flush(manifest);
  await until(() => caches(root).querySelector('summary') !== null);
  return caches(root);
}

describe('ContentCaches', () => {
  it('lists each pack with its file count and total size', async () => {
    const section = await renderAnswered();
    const summaries = [...section.querySelectorAll('summary')].map((summary) => summary.textContent.trim());

    expect(summaries).toStrictEqual(['Player Core: 3 files, 1.5 MB', 'Pioneer pack: core-rules: 0 files, 0 kB']);
  });

  it('links every bundle of a pack to its public download, with its size', async () => {
    const section = await renderAnswered();
    const links = [...section.querySelectorAll('a')];

    expect(links.map((link) => link.getAttribute('href'))).toStrictEqual([
      download(MECHANICS),
      download(NAMES),
      download(PACK_FILE),
    ]);
    expect(links.map((link) => link.getAttribute('aria-label'))).toStrictEqual([
      `${MECHANICS}: download from player-core`,
      `${NAMES}: download from player-core`,
      `${PACK_FILE}: download from player-core`,
    ]);
    expect(section.textContent).toContain('2.5 kB');
  });

  it('names the Foundry release an imported pack came from', async () => {
    const section = await renderAnswered();

    expect(section.textContent).toContain('Foundry release pf2e-8.6.0');
  });

  it('says so when the caches cannot be loaded', async () => {
    const root = await renderLegalPage();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/content/manifest')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await until(() => caches(root).textContent.includes('Could not load'));

    expect(caches(root).textContent).toContain('Could not load the content caches.');
  });
});
