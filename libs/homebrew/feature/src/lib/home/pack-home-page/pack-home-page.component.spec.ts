import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
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
    await harness.fixture.whenStable();

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
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Could not load this pack.');
    });
  });
});
