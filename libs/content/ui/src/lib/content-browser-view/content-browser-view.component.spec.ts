import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { ContentBrowserTier } from '../browser-state';
import type { ContentBrowserState } from '../browser-state';
import {
  BROWSER_FIELDS,
  BROWSER_LIST,
  BROWSER_ROWS,
  LISTING_STATE,
  loaded,
  NO_FACETS,
  PICKED_STATE,
  SHIELD_BLOCK,
  SHIELD_BLOCK_CARD,
} from '../testing/browser-fixtures';
import { provideContentUiI18nTesting } from '../testing/provide-content-ui-testing';
import { ContentBrowserView } from './content-browser-view.component';

const FIRST_ROW = BROWSER_ROWS[0]?.name ?? '';

/** Renders the view at `tier` over `state`, with the same list and entry whatever the tier. */
async function render(
  tier: ContentBrowserTier,
  state: ContentBrowserState,
): Promise<ComponentFixture<ContentBrowserView>> {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideContentUiI18nTesting()] });
  const fixture = TestBed.createComponent(ContentBrowserView);
  fixture.componentRef.setInput('tier', tier);
  fixture.componentRef.setInput('state', state);
  fixture.componentRef.setInput('kindOptions', []);
  fixture.componentRef.setInput('fields', BROWSER_FIELDS);
  fixture.componentRef.setInput('facetState', NO_FACETS);
  fixture.componentRef.setInput('list', loaded(BROWSER_LIST));
  fixture.componentRef.setInput('entry', loaded({ card: SHIELD_BLOCK_CARD }));
  fixture.componentRef.setInput('columns', []);
  await fixture.whenStable();
  return fixture;
}

const has = (fixture: ComponentFixture<ContentBrowserView>, selector: string): boolean =>
  (fixture.nativeElement as HTMLElement).querySelector(selector) !== null;

const text = (fixture: ComponentFixture<ContentBrowserView>): string =>
  (fixture.nativeElement as HTMLElement).textContent;

describe('ContentBrowserView page tier', () => {
  it('shows the search over the list', async () => {
    const fixture = await render(ContentBrowserTier.Page, LISTING_STATE);
    expect(has(fixture, 'fr-search-input')).toBe(true);
  });

  it('shows the filter bar', async () => {
    const fixture = await render(ContentBrowserTier.Page, LISTING_STATE);
    expect(has(fixture, 'fr-filter-bar')).toBe(true);
  });

  it('shows the facet panel', async () => {
    const fixture = await render(ContentBrowserTier.Page, LISTING_STATE);
    expect(has(fixture, 'pio-facet-filter')).toBe(true);
  });

  it('shows the entries in a table', async () => {
    const fixture = await render(ContentBrowserTier.Page, LISTING_STATE);
    expect(has(fixture, 'fr-table')).toBe(true);
  });

  it('leaves an entry to its own route, even with one in the state', async () => {
    const fixture = await render(ContentBrowserTier.Page, PICKED_STATE);
    expect(has(fixture, 'pio-entry-preview')).toBe(false);
  });
});

describe('ContentBrowserView panel tier', () => {
  it('shows the search', async () => {
    const fixture = await render(ContentBrowserTier.Panel, LISTING_STATE);
    expect(has(fixture, 'fr-search-input')).toBe(true);
  });

  it('shows the compact filter bar', async () => {
    const fixture = await render(ContentBrowserTier.Panel, LISTING_STATE);
    expect(has(fixture, 'fr-filter-bar')).toBe(true);
  });

  it('leaves out the facet panel', async () => {
    const fixture = await render(ContentBrowserTier.Panel, LISTING_STATE);
    expect(has(fixture, 'pio-facet-filter')).toBe(false);
  });

  it('lists the entries compactly, not in a table', async () => {
    const fixture = await render(ContentBrowserTier.Panel, LISTING_STATE);
    expect(has(fixture, 'fr-table')).toBe(false);
  });

  it('names the entries it lists', async () => {
    const fixture = await render(ContentBrowserTier.Panel, LISTING_STATE);
    expect(text(fixture)).toContain(FIRST_ROW);
  });

  it('picks an entry in place when its name is pressed', async () => {
    const fixture = await render(ContentBrowserTier.Panel, LISTING_STATE);
    const names = [...(fixture.nativeElement as HTMLElement).querySelectorAll('fr-list-item button')];
    (names[0] as HTMLElement).click();
    expect(fixture.componentInstance.state().selected).toStrictEqual(BROWSER_ROWS[0]?.ref);
  });

  it('shows the picked entry instead of the list', async () => {
    const fixture = await render(ContentBrowserTier.Panel, PICKED_STATE);
    expect(has(fixture, 'pio-entry-preview')).toBe(true);
  });

  it('goes back to the list from the entry', async () => {
    const fixture = await render(ContentBrowserTier.Panel, PICKED_STATE);
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    buttons.find((button) => button.textContent.trim() === 'Back to the list')?.click();
    expect(fixture.componentInstance.state().selected).toBeUndefined();
  });
});

describe('ContentBrowserView preview tier', () => {
  it('shows the picked entry', async () => {
    const fixture = await render(ContentBrowserTier.Preview, PICKED_STATE);
    expect(text(fixture)).toContain('Shield Block');
  });

  it('leaves out the search', async () => {
    const fixture = await render(ContentBrowserTier.Preview, PICKED_STATE);
    expect(has(fixture, 'fr-search-input')).toBe(false);
  });

  it('leaves out the list', async () => {
    const fixture = await render(ContentBrowserTier.Preview, PICKED_STATE);
    expect(has(fixture, 'fr-filter-bar')).toBe(false);
  });

  it('keeps the state it was given', async () => {
    const fixture = await render(ContentBrowserTier.Preview, PICKED_STATE);
    expect(fixture.componentInstance.state().selected).toStrictEqual(SHIELD_BLOCK);
  });
});
