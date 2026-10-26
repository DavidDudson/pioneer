import { TestBed } from '@angular/core/testing';
import type { AsyncQuery } from '@pioneer/frontier';
import { describe, expect, it } from 'vitest';

import type { CachePack } from '../cache-pack';
import { CORE_RULES_CACHE, failed, loaded, stillLoading, PLAYER_CORE_CACHE } from '../testing/cache-fixtures';
import { provideLegalUiI18nTesting } from '../testing/provide-legal-ui-testing';
import { ContentCachesView } from './content-caches-view.component';

const JUST_UNDER_A_MEGABYTE = 999_960;

/** `pack` with every bundle, and the pack, the given size. */
function ofSize(pack: CachePack, bytes: number): CachePack {
  return { ...pack, bytes, files: pack.files.map((file) => ({ ...file, bytes })) };
}

async function render(caches: AsyncQuery<readonly CachePack[]>): Promise<HTMLElement> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [...provideLegalUiI18nTesting()] });
  const fixture = TestBed.createComponent(ContentCachesView);
  fixture.componentRef.setInput('caches', caches);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(ContentCachesView, () => {
  it('lists each pack with its file count and total size', async () => {
    const root = await render(loaded([PLAYER_CORE_CACHE, CORE_RULES_CACHE]));
    const summaries = [...root.querySelectorAll('summary')].map((summary) => summary.textContent.trim());

    expect(summaries).toStrictEqual(['Player Core: 3 files, 1.5 MB', 'Pioneer pack: core-rules: 0 files, 0 kB']);
  });

  it('links every bundle to the url it is given, with its size', async () => {
    const root = await render(loaded([PLAYER_CORE_CACHE]));
    const links = [...root.querySelectorAll('a')];

    expect(links.map((link) => link.getAttribute('href'))).toStrictEqual(PLAYER_CORE_CACHE.files.map(({ url }) => url));
    expect(root.textContent).toContain('2.5 kB');
  });

  it('shows a size just under a megabyte as a megabyte, not as 1,000 kB', async () => {
    const root = await render(loaded([ofSize(PLAYER_CORE_CACHE, JUST_UNDER_A_MEGABYTE)]));

    expect(root.textContent).toContain('1 MB');
    expect(root.textContent).not.toContain('1,000 kB');
  });

  it('names the Foundry release an imported pack came from', async () => {
    const root = await render(loaded([PLAYER_CORE_CACHE]));

    expect(root.textContent).toContain('Foundry release pf2e-8.6.0');
  });

  it('shows placeholders while loading', async () => {
    const root = await render(stillLoading());

    expect(root.querySelectorAll('fr-skeleton')).toHaveLength(3);
  });

  it('says so when the caches cannot be loaded', async () => {
    const root = await render(failed());

    expect(root.textContent).toContain('Could not load the content caches.');
  });
});
