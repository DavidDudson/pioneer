import { HttpTestingController } from '@angular/common/http/testing';
import type { TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { homebrewRoutes } from '../../homebrew.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const entryId = '3c1f0c2e-8d4a-5e7b-9c3f-1a2b3c4d5e70';

const pack = {
  id,
  version: 1,
  slug: 'amiri-feats',
  title: 'Amiri feats',
  publisher: 'Amiri',
  ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
  visibility: 'private',
  entryCount: 1,
  updatedAt: '2026-10-10T10:00:00.000Z',
};

const strike = {
  id: entryId,
  packId: id,
  kind: 'feat',
  slug: 'feat:rending-strike',
  name: 'Rending Strike',
  level: 1,
  rarity: 'common',
  traits: [],
  updatedAt: '2026-10-10T10:00:00.000Z',
};

const archivedStrike = { ...strike, archivedAt: '2026-10-11T10:00:00.000Z' };

const liveUrl = `/api/homebrew/packs/${id}/entries?archived=false`;
const archivedUrl = `/api/homebrew/packs/${id}/entries?archived=true`;

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }

  return value;
}

/** Every button whose text starts with `label`, in document order. */
function buttons(root: HTMLElement, label: string): Array<HTMLButtonElement> {
  return [...root.querySelectorAll('button')].filter((candidate) => candidate.textContent.trim().startsWith(label));
}

/** The request a press sent, which goes out a tick after the press. */
async function sent(url: string): Promise<TestRequest> {
  return vi.waitFor(() => TestBed.inject(HttpTestingController).expectOne(url));
}

/** Opens the pack home and answers its loads: the pack, no dependencies and `entries` (the live list). */
async function open(entries: ReadonlyArray<object>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'homebrew', children: homebrewRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/homebrew/${id}`);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`/api/homebrew/packs/${id}`).flush(pack);
  await vi.waitFor(() => {
    http
      .expectOne(`/api/homebrew/packs/${id}/dependencies`)
      .flush({ editable: true, dependencies: [], candidates: [] });
  });
  await vi.waitFor(() => {
    http.expectOne(liveUrl).flush(entries);
  });
  await harness.fixture.whenStable();
  await vi.waitFor(() => {
    expect(present(harness.routeNativeElement).querySelector('pio-pack-entry-create')).not.toBeNull();
  });

  return harness;
}

/** Answers what a change refetches: the entry list at `url` with `entries`, and the pack, whose count moved. */
async function refetched(url: string, entries: ReadonlyArray<object>): Promise<void> {
  const http = TestBed.inject(HttpTestingController);
  await vi.waitFor(() => {
    http.expectOne(url).flush(entries);
  });
  await vi.waitFor(() => {
    http.expectOne(`/api/homebrew/packs/${id}`).flush(pack);
  });
}

describe('PackEntries', () => {
  it('lists the live entries with their kind and rarity', async () => {
    const harness = await open([strike]);

    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('Rending Strike');
      expect(text).toContain('Feat');
      expect(text).toContain('Common');
    });
  });

  it('says so when the pack has no entries', async () => {
    const harness = await open([]);

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('No entries yet');
    });
  });

  it('archives an entry on the first press and the list follows', async () => {
    const harness = await open([strike]);
    await vi.waitFor(() => {
      expect(buttons(present(harness.routeNativeElement), 'Archive')).toHaveLength(1);
    });

    present(buttons(present(harness.routeNativeElement), 'Archive')[0]).click();
    const archive = await sent(`/api/homebrew/packs/${id}/entries/${entryId}/archive`);
    expect(archive.request.method).toBe('POST');
    archive.flush(archivedStrike);
    await refetched(liveUrl, []);
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('No entries yet');
    });
  });

  it('shows the archived entries on request and restores one', async () => {
    const harness = await open([strike]);
    const http = TestBed.inject(HttpTestingController);

    present(buttons(present(harness.routeNativeElement), 'Show archived')[0]).click();
    await vi.waitFor(() => {
      http.expectOne(archivedUrl).flush([archivedStrike]);
    });
    await vi.waitFor(() => {
      expect(buttons(present(harness.routeNativeElement), 'Restore')).toHaveLength(1);
    });

    present(buttons(present(harness.routeNativeElement), 'Restore')[0]).click();
    const restore = await sent(`/api/homebrew/packs/${id}/entries/${entryId}/restore`);
    expect(restore.request.method).toBe('POST');
    restore.flush(strike);
    await refetched(archivedUrl, []);
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Nothing is archived.');
    });
  });

  it('creates an entry of the chosen kind from its name', async () => {
    const harness = await open([]);
    const root = present(harness.routeNativeElement);
    const name = present(root.querySelector<HTMLInputElement>('pio-pack-entry-create fr-text-field input'));
    name.value = 'Rending Strike';
    name.dispatchEvent(new Event('input'));
    harness.detectChanges();

    present(root.querySelector<HTMLButtonElement>('pio-pack-entry-create button[type="submit"]')).click();
    const create = await sent(`/api/homebrew/packs/${id}/entries`);

    expect(create.request.method).toBe('POST');
    expect(create.request.body).toStrictEqual({ kind: 'feat', name: 'Rending Strike', rarity: 'common', traits: [] });
    create.flush(strike);
    await refetched(liveUrl, [strike]);
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Rending Strike');
    });
  });

  it('says why an entry cannot be created when its slug is taken', async () => {
    const harness = await open([strike]);
    const root = present(harness.routeNativeElement);
    const name = present(root.querySelector<HTMLInputElement>('pio-pack-entry-create fr-text-field input'));
    name.value = 'Rending Strike';
    name.dispatchEvent(new Event('input'));
    harness.detectChanges();

    present(root.querySelector<HTMLButtonElement>('pio-pack-entry-create button[type="submit"]')).click();
    const create = await sent(`/api/homebrew/packs/${id}/entries`);
    create.flush(
      { type: 'conflict', title: 'Conflict', status: 409, message: { key: 'homebrew.entry.slugTaken' } },
      { status: 409, statusText: 'Conflict' },
    );
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('already has an entry of that kind');
    });
  });
});
