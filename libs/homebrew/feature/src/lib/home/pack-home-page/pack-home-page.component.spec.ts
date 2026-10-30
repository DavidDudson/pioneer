import { HttpTestingController } from '@angular/common/http/testing';
import type { DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { homebrewRoutes } from '../../homebrew.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const ownerId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

async function open(): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'homebrew', children: homebrewRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  return RouterTestingHarness.create(`/homebrew/${id}`);
}

const loadedPack = {
  id,
  version: 1,
  slug: 'amiri-feats',
  title: 'Amiri feats',
  publisher: 'Amiri',
  ownerId,
  visibility: 'private',
  entryCount: 0,
  updatedAt: '2026-10-10T10:00:00.000Z',
};

/** Opens the pack home and answers its load with the pack. */
async function openLoaded(): Promise<RouterTestingHarness> {
  const harness = await open();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`/api/homebrew/packs/${id}`).flush(loadedPack);
  // The dependencies section loads beside the pack and holds the page unstable until it is answered.
  await vi.waitFor(() => {
    http
      .expectOne(`/api/homebrew/packs/${id}/dependencies`)
      .flush({ editable: true, dependencies: [], candidates: [] });
  });
  await harness.fixture.whenStable();
  await vi.waitFor(() => {
    expect(present(harness.routeNativeElement).textContent).toContain('amiri-feats');
  });
  return harness;
}

function visibilityField(harness: RouterTestingHarness): DebugElement {
  const [field] = harness.fixture.debugElement.queryAll((each) => each.componentInstance instanceof PickerField);
  return present(field);
}

describe('PackHomePage', () => {
  it('shows the pack’s slug, author and that it is private', async () => {
    const harness = await open();
    TestBed.inject(HttpTestingController).expectOne(`/api/homebrew/packs/${id}`).flush({
      id,
      version: 1,
      slug: 'amiri-feats',
      title: 'Amiri feats',
      publisher: 'Amiri',
      ownerId,
      visibility: 'private',
      entryCount: 0,
      updatedAt: '2026-10-10T10:00:00.000Z',
    });
    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('amiri-feats');
      expect(text).toContain('Amiri');
      expect(text).toContain('Private: only you can see it');
      expect(text).toContain('No entries');
    });
  });

  it('says so when the pack cannot be loaded', async () => {
    const harness = await open();
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/homebrew/packs/${id}`)
      .flush({ type: 'not-found' }, { status: 404, statusText: 'Not Found' });
    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Could not load this pack.');
    });
  });

  it('lets the owner choose who can see the pack, and shows the new choice', async () => {
    const harness = await openLoaded();
    const http = TestBed.inject(HttpTestingController);
    visibilityField(harness).triggerEventHandler('valueChange', 'public');
    const request = http.expectOne(`/api/homebrew/packs/${id}/visibility`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toStrictEqual({ visibility: 'public' });
    request.flush({ ...loadedPack, visibility: 'public' });
    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Public: everyone signed in');
    });
  });

  it('says which campaigns still enable the pack when it cannot go private', async () => {
    const harness = await openLoaded();
    const http = TestBed.inject(HttpTestingController);

    visibilityField(harness).triggerEventHandler('valueChange', 'campaign');
    http.expectOne(`/api/homebrew/packs/${id}/visibility`).flush({ ...loadedPack, visibility: 'campaign' });
    await harness.fixture.whenStable();
    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain(
        'Campaign: members of campaigns that enable it',
      );
    });
    visibilityField(harness).triggerEventHandler('valueChange', 'private');
    http.expectOne(`/api/homebrew/packs/${id}/visibility`).flush(
      {
        type: 'conflict',
        title: 'Conflict',
        status: 409,
        message: { key: 'homebrew.pack.campaignsEnableIt', params: { campaigns: 'Kingmaker, Rise of the Runelords' } },
      },
      { status: 409, statusText: 'Conflict' },
    );
    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('Kingmaker, Rise of the Runelords');
      expect(text).toContain('Campaign: members of campaigns that enable it');
    });
  });

  it('puts the picker back on the real visibility when a change fails for any other reason', async () => {
    const harness = await openLoaded();
    visibilityField(harness).triggerEventHandler('valueChange', 'public');
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/homebrew/packs/${id}/visibility`)
      .flush({ type: 'internal', title: 'Error', status: 500 }, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain(
        'Could not change who can see this pack. Try again.',
      );
    });
    const field = visibilityField(harness).componentInstance as PickerField<string, object>;
    expect(field.value()).toBe('private');
  });

  it('tells someone who does not own the pack that only the owner can change it', async () => {
    const harness = await openLoaded();
    visibilityField(harness).triggerEventHandler('valueChange', 'public');
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/homebrew/packs/${id}/visibility`)
      .flush(
        { type: 'forbidden', title: 'Forbidden', status: 403, message: { key: 'problem.forbidden' } },
        { status: 403, statusText: 'Forbidden' },
      );
    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain(
        'Only the pack’s owner can change who can see it.',
      );
    });
  });
});
