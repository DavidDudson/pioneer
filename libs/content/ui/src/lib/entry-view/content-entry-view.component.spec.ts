import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import type { StoreLink } from '../browse-source';
import { SHIELD_BLOCK_CARD } from '../testing/browser-fixtures';
import { provideContentUiI18nTesting } from '../testing/provide-content-ui-testing';
import { ContentEntryView } from './content-entry-view.component';

const PLAYER_CORE_STORE: StoreLink = {
  title: 'rules.book.title.playerCore',
  url: 'https://store.paizo.com/pathfinder-player-core/',
};

async function render(stores: readonly StoreLink[], untranslated = false): Promise<ComponentFixture<ContentEntryView>> {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideContentUiI18nTesting()] });
  const fixture = TestBed.createComponent(ContentEntryView);
  fixture.componentRef.setInput('card', SHIELD_BLOCK_CARD);
  fixture.componentRef.setInput('stores', stores);
  fixture.componentRef.setInput('untranslated', untranslated);
  await fixture.whenStable();

  return fixture;
}

const links = (fixture: ComponentFixture<ContentEntryView>): readonly HTMLAnchorElement[] => [
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  ...(fixture.nativeElement as HTMLElement).querySelectorAll('a'),
];

const shownText = (fixture: ComponentFixture<ContentEntryView>): string =>
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  (fixture.nativeElement as HTMLElement).textContent;

describe(ContentEntryView, () => {
  it('links each book to its Paizo Store page', async () => {
    const fixture = await render([PLAYER_CORE_STORE]);
    const store = links(fixture).find((link) => link.textContent.includes('Buy Player Core from Paizo'));
    expect(store?.getAttribute('href')).toBe(PLAYER_CORE_STORE.url);
  });

  it('shows no store link for a book Paizo does not sell', async () => {
    const fixture = await render([]);
    expect(links(fixture).some((link) => link.textContent.includes('Buy'))).toBe(false);
  });

  it('marks a description that fell back to the source language', async () => {
    const fixture = await render([], true);
    expect(shownText(fixture)).toContain('Not translated yet: shown in English');
  });

  it('marks nothing for a translated description', async () => {
    const fixture = await render([]);
    expect(shownText(fixture)).not.toContain('Not translated yet');
  });
});
