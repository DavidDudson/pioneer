import { TestBed } from '@angular/core/testing';
import { ContentId } from '@pioneer/rules/sdk';
import { ENTRY_PREVIEWS } from '@pioneer/rules/ui';
import type { EntryPreviews } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { appConfig } from './app.config';

const SOME_ENTRY = ContentId.parse('00000000-0000-4000-8000-0000000000aa');

describe('the app root previews', () => {
  it('give every page without previews of its own a card to fetch, and none to read before it is fetched', () => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
    const previews: EntryPreviews = TestBed.inject(ENTRY_PREVIEWS);

    expect(previews.load).toBeDefined();
    expect(previews.preview(SOME_ENTRY)).toBeUndefined();
    expect(previews.target?.(SOME_ENTRY)).toBeUndefined();
  });
});
