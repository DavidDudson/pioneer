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

async function render(stores: readonly StoreLink[]): Promise<ComponentFixture<ContentEntryView>> {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideContentUiI18nTesting()] });
  const fixture = TestBed.createComponent(ContentEntryView);
  fixture.componentRef.setInput('card', SHIELD_BLOCK_CARD);
  fixture.componentRef.setInput('stores', stores);
  await fixture.whenStable();
  return fixture;
}

const links = (fixture: ComponentFixture<ContentEntryView>): readonly HTMLAnchorElement[] => [
  ...(fixture.nativeElement as HTMLElement).querySelectorAll('a'),
];

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
});
