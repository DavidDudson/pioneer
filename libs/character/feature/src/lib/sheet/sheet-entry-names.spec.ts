import { TestBed } from '@angular/core/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import { provideServerStateTesting } from '../testing/provide-server-state-testing';
import { sheetEntryNames } from './sheet-entry-names';

function id(pack: string, slug: string): ContentId {
  return ContentId.parse(contentId(PackId.parse(pack), EntrySlug.parse(slug)));
}

describe(sheetEntryNames, () => {
  it('names every entry the sheet registry holds by its display name', async () => {
    TestBed.configureTestingModule({ providers: provideServerStateTesting() });
    const registry = await TestBed.inject(ContentLoader).registry(CHARACTER_CONTENT_KINDS);

    const names = sheetEntryNames(registry);

    expect(names.get(id('player-core', 'ancestry:elf'))).toBe('Elf');
    expect(names.get(id('core-rules', 'statistic:armor-class'))).toBe('Armor Class');
  });
});
