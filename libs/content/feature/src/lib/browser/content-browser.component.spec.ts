import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { contentBrowserMessages, ContentBrowserTier, EMPTY_BROWSER_STATE } from '@pioneer/content/ui';
import type { ContentBrowserState } from '@pioneer/content/ui';
import { frontierMessages } from '@pioneer/frontier';
import { prebuildContentTesting, provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import { ContentKind, rulesMessages } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import contentMessages from '../../i18n/en.json';
import { BROWSE_LOADER } from '../testing/browse-fixtures';
import { ContentBrowser } from './content-browser.component';

/** Four feats listed, nothing searched or filtered or picked: what the three tiers are given. */
const FEATS: ContentBrowserState = { ...EMPTY_BROWSER_STATE, kinds: [ContentKind.Feat] };

/** The same, with one feat picked. */
const PICKED: ContentBrowserState = { ...FEATS, selected: { kind: ContentKind.Feat, name: 'shield-block' } };

async function open(tier: ContentBrowserTier, state: ContentBrowserState): Promise<ComponentFixture<ContentBrowser>> {
  const delivery = new TestContentDelivery([BROWSE_LOADER]);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideI18n({
        en: async () => ({
          ...frontierMessages,
          ...rulesMessages,
          ...contentBrowserMessages,
          content: contentMessages,
        }),
      }),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      ...provideContentTesting(delivery),
    ],
  });
  const fixture = TestBed.createComponent(ContentBrowser);
  fixture.componentRef.setInput('tier', tier);
  fixture.componentRef.setInput('state', state);
  await fixture.whenStable();
  return fixture;
}

const root = (fixture: ComponentFixture<ContentBrowser>): HTMLElement => fixture.nativeElement as HTMLElement;

/** The names the list shows, in order, once `count` of them have loaded. */
async function listed(fixture: ComponentFixture<ContentBrowser>, selector: string, count: number): Promise<string[]> {
  const names = (): string[] => [...root(fixture).querySelectorAll(selector)].map((each) => each.textContent.trim());
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(names()).toHaveLength(count);
  });
  return names();
}

const FEAT_NAMES = ['Incredible-initiative', 'Power-attack', 'Shield-block', 'Toughness'];

describe(ContentBrowser, () => {
  beforeAll(async () => {
    await prebuildContentTesting([BROWSE_LOADER]);
  }, 60_000);

  it('lists the feats in a table at the page tier', async () => {
    const fixture = await open(ContentBrowserTier.Page, FEATS);
    await expect(listed(fixture, 'fr-table tbody tr td:first-child', 4)).resolves.toStrictEqual(FEAT_NAMES);
  });

  it('lists the same feats compactly at the panel tier', async () => {
    const fixture = await open(ContentBrowserTier.Panel, FEATS);
    await expect(listed(fixture, 'fr-list-item', 4)).resolves.toStrictEqual(FEAT_NAMES);
  });

  it('shows the filter bar at the panel tier', async () => {
    const fixture = await open(ContentBrowserTier.Panel, FEATS);
    await listed(fixture, 'fr-list-item', 4);
    expect(root(fixture).querySelector('fr-filter-bar')).not.toBeNull();
  });

  it('leaves the facet panel to the page tier', async () => {
    const fixture = await open(ContentBrowserTier.Panel, FEATS);
    await listed(fixture, 'fr-list-item', 4);
    expect(root(fixture).querySelector('pio-facet-filter')).toBeNull();
  });

  it('shows the picked entry alone at the preview tier', async () => {
    const fixture = await open(ContentBrowserTier.Preview, PICKED);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root(fixture).textContent).toContain('Raise a shield, as with');
    });
  });

  it('names the entries a description refers to, from the same bundles', async () => {
    const fixture = await open(ContentBrowserTier.Preview, PICKED);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root(fixture).textContent).toContain('Power-attack');
    });
  });

  it('shows the same entry in the panel tier when one is picked', async () => {
    const fixture = await open(ContentBrowserTier.Panel, PICKED);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root(fixture).textContent).toContain('Raise a shield, as with');
    });
  });

  it('writes the entry a name picks to the state', async () => {
    const fixture = await open(ContentBrowserTier.Panel, FEATS);
    const changed = vi.fn<(state: ContentBrowserState) => void>();
    fixture.componentInstance.stateChange.subscribe(changed);
    await listed(fixture, 'fr-list-item', 4);
    const names = [...root(fixture).querySelectorAll<HTMLElement>('fr-list-item button')];
    names.find((each) => each.textContent.trim() === 'Toughness')?.click();
    expect(changed).toHaveBeenCalledWith({ ...FEATS, selected: { kind: ContentKind.Feat, name: 'toughness' } });
  });
});
