import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContentLicense, ProductLine } from '@pioneer/rules/sdk';
import type { Book, SourceRef } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { SourceBadge, SourceBadgeMode } from './source-badge.component';
import { bookOf, PLAYER_CORE, PLAYER_CORE_SOURCE, WEB_SOURCE } from './source-badge.fixtures';

/** What a spec sets on the badge. */
interface Setup {
  readonly source: SourceRef;
  readonly book: Book | undefined;
  readonly mode: SourceBadgeMode;
  readonly license?: ContentLicense;
}

async function render({
  source,
  book,
  mode,
  license = ContentLicense.Orc,
}: Setup): Promise<ComponentFixture<SourceBadge>> {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SourceBadge);
  fixture.componentRef.setInput('source', source);
  fixture.componentRef.setInput('book', book);
  fixture.componentRef.setInput('license', license);
  fixture.componentRef.setInput('mode', mode);
  await fixture.whenStable();
  return fixture;
}

const host = (fixture: ComponentFixture<SourceBadge>): HTMLElement => fixture.nativeElement as HTMLElement;

/** Opens the popover the way a keyboard does, by focusing the trigger. */
async function open(fixture: ComponentFixture<SourceBadge>): Promise<string> {
  host(fixture).querySelector('button')?.focus();
  // The card opens on a timer, so a focus is a macrotask before it shows.
  await new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
  fixture.detectChanges();
  await fixture.whenStable();
  return document.body.textContent;
}

describe('SourceBadge compact', () => {
  it('shows the book icon and no text', async () => {
    const fixture = await render({ source: PLAYER_CORE_SOURCE, book: PLAYER_CORE, mode: SourceBadgeMode.Compact });
    expect(host(fixture).querySelector('fr-badge')?.textContent.trim()).toBe('');
  });

  it('names the book and its type for assistive tech', async () => {
    const fixture = await render({ source: PLAYER_CORE_SOURCE, book: PLAYER_CORE, mode: SourceBadgeMode.Compact });
    expect(host(fixture).querySelector('button')?.getAttribute('aria-label')).toBe(
      'Source: Player Core, Remaster rulebook',
    );
  });
});

describe('SourceBadge expanded', () => {
  it('shows the name and the year', async () => {
    const fixture = await render({ source: PLAYER_CORE_SOURCE, book: PLAYER_CORE, mode: SourceBadgeMode.Expanded });
    expect(host(fixture).textContent).toContain('Player Core 2023');
  });

  it('shows the name alone for a book with no release date', async () => {
    const { released: _released, ...rest } = PLAYER_CORE;
    const fixture = await render({ source: PLAYER_CORE_SOURCE, book: rest, mode: SourceBadgeMode.Expanded });
    expect(host(fixture).textContent.trim()).toBe('Player Core');
  });
});

describe('SourceBadge popover', () => {
  it('gives the details and the links of the book', async () => {
    const fixture = await render({ source: PLAYER_CORE_SOURCE, book: PLAYER_CORE, mode: SourceBadgeMode.Compact });
    const text = await open(fixture);
    for (const expected of ['Rulebook', 'Spring 2026', '8.6.0', 'Page: 46', 'Archives of Nethys', 'Paizo Store']) {
      expect(text).toContain(expected);
    }
  });

  it('calls OGL content in a remaster book legacy', async () => {
    const fixture = await render({
      source: PLAYER_CORE_SOURCE,
      book: PLAYER_CORE,
      mode: SourceBadgeMode.Compact,
      license: ContentLicense.Ogl,
    });
    expect(host(fixture).querySelector('button')?.getAttribute('aria-label')).toContain('Legacy rulebook');
  });

  it('types a legacy adventure by its book', async () => {
    const book = bookOf('the-show-must-go-on', ProductLine.AdventurePaths, false);
    const fixture = await render({
      source: PLAYER_CORE_SOURCE,
      book,
      mode: SourceBadgeMode.Compact,
      license: ContentLicense.Ogl,
    });
    expect(host(fixture).querySelector('button')?.getAttribute('aria-label')).toContain('Legacy campaign');
  });

  it('links a web source to its page', async () => {
    const fixture = await render({
      source: WEB_SOURCE,
      book: undefined,
      mode: SourceBadgeMode.Compact,
      license: ContentLicense.Homebrew,
    });
    const text = await open(fixture);
    expect(text).toContain('Open the page');
  });
});
