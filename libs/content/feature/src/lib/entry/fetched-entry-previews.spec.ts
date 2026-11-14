import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { prebuildContentTesting, provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import { ContentKind, packContentsFromFiles, Trait, traitId } from '@pioneer/rules/sdk';
import type { PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { canPreview } from '@pioneer/rules/ui';
import type { EntryPreviews } from '@pioneer/rules/ui';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { beforeAll, describe, expect, it } from 'vitest';

import { fetchedEntryPreviews } from './fetched-entry-previews';

const FIRE = Trait.parse('fire');
const UNKNOWN = Trait.parse('not-a-trait');

const PACK = new ContentPackBuilder()
  .withId('core-rules')
  .withItem(ContentKind.Trait, 'fire', { appliesTo: [] })
  .build();
const LOADER: PackContentsLoader = {
  id: PACK.id,
  load: async () => packContentsFromFiles(PACK.manifest, [PACK.otherEntries]),
};

function previews(): EntryPreviews {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      ...provideContentTesting(new TestContentDelivery([LOADER])),
    ],
  });
  return TestBed.runInInjectionContext(fetchedEntryPreviews);
}

describe('the app-wide previews', () => {
  beforeAll(async () => {
    await prebuildContentTesting([LOADER]);
  }, 60_000);

  it('can open a trait card', () => {
    expect(canPreview(previews(), traitId(FIRE))).toBe(true);
  });

  it('loads the trait entry the slug names', async () => {
    const card = await previews().load?.(traitId(FIRE));

    expect(card?.name).toBe('Fire');
  });

  it('resolves nothing for a slug the vocabulary lacks', async () => {
    const card = await previews().load?.(traitId(UNKNOWN));

    expect(card).toBeUndefined();
  });
});
