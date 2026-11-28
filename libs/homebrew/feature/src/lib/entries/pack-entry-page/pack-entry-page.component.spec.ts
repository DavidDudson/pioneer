import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { homebrewRoutes } from '../../homebrew.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const entryId = '3c1f0c2e-8d4a-5e7b-9c3f-1a2b3c4d5e70';

const strike = {
  id: entryId,
  packId: id,
  kind: 'feat',
  slug: 'feat:rending-strike',
  name: 'Rending Strike',
  level: 3,
  rarity: 'common',
  traits: ['fighter'],
  updatedAt: '2026-10-10T10:00:00.000Z',
};

const pack = {
  id,
  version: 2,
  slug: 'amiri-feats',
  title: 'Amiri feats',
  publisher: 'Amiri',
  ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
  visibility: 'private',
  entryCount: 1,
  updatedAt: '2026-10-10T10:00:00.000Z',
};

const liveUrl = `/api/homebrew/packs/${id}/entries?archived=false`;

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }

  return value;
}

/** Opens the entry's page and answers the pack's entry list with `entries`. */
async function open(entries: ReadonlyArray<object>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'homebrew', children: homebrewRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/homebrew/${id}/entries/${entryId}`);
  const http = TestBed.inject(HttpTestingController);
  await vi.waitFor(() => {
    http.expectOne(liveUrl).flush(entries);
  });
  // Opening the page selects the pack too, which loads it.
  await vi.waitFor(() => {
    http.expectOne(`/api/homebrew/packs/${id}`).flush(pack);
  });
  await harness.fixture.whenStable();

  return harness;
}

describe('PackEntryPage', () => {
  it('fills the form from the entry and says its kind cannot change', async () => {
    const harness = await open([strike]);

    await vi.waitFor(() => {
      const root = present(harness.routeNativeElement);
      expect(present(root.querySelector('input')).value).toBe('Rending Strike');
      expect(root.textContent).toContain('Kind: Feat');
    });
  });

  it('saves the new name with the level and traits the entry has, then returns to the pack', async () => {
    const harness = await open([strike]);
    await vi.waitFor(() => {
      expect(present(present(harness.routeNativeElement).querySelector('input')).value).toBe('Rending Strike');
    });
    const root = present(harness.routeNativeElement);
    const name = present(root.querySelector('input'));
    name.value = 'Rending Blow';
    name.dispatchEvent(new Event('input'));
    harness.detectChanges();

    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    const http = TestBed.inject(HttpTestingController);
    const save = await vi.waitFor(() => http.expectOne(`/api/homebrew/packs/${id}/entries/${entryId}`));

    expect(save.request.method).toBe('PATCH');
    expect(save.request.body).toStrictEqual({ name: 'Rending Blow', rarity: 'common', level: 3, traits: ['fighter'] });
    save.flush({ ...strike, name: 'Rending Blow' });
    // The change refetches the list and the pack before the page leaves.
    await vi.waitFor(() => {
      http.expectOne(liveUrl).flush([{ ...strike, name: 'Rending Blow' }]);
    });
    await vi.waitFor(() => {
      http.expectOne(`/api/homebrew/packs/${id}`).flush(pack);
    });

    const router = TestBed.inject(Router);
    await vi.waitFor(() => {
      expect(router.url).toBe(`/homebrew/${id}`);
    });
  });

  it('says so when the entry is not in the live list', async () => {
    const harness = await open([]);

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Could not load this entry.');
    });
  });
});
