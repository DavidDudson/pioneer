import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContentLicense, SourceRef } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import type { BrowseSource } from '../browse-source';
import { provideContentUiI18nTesting } from '../testing/provide-content-ui-testing';
import { BrowseSources } from './browse-sources.component';

const sources = (...books: readonly string[]): readonly BrowseSource[] =>
  books.map((book) => ({
    source: SourceRef.parse({ kind: 'book', book }),
    book: undefined,
    license: ContentLicense.Orc,
  }));

async function render(items: readonly BrowseSource[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideContentUiI18nTesting()] });
  const fixture = TestBed.createComponent(BrowseSources);
  fixture.componentRef.setInput('sources', items);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(BrowseSources, () => {
  it('shows a badge for each source', async () => {
    const host = await render(sources('player-core', 'gm-core'));
    expect(host.querySelectorAll('pio-source')).toHaveLength(2);
  });

  it('shows nothing for a row with no source', async () => {
    const host = await render([]);
    expect(host.querySelectorAll('pio-source')).toHaveLength(0);
  });
});
