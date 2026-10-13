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
const ownerId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

function packJson(title: string, entryCount: number): object {
  return {
    id,
    version: 1,
    slug: 'amiri-feats',
    title,
    publisher: 'Amiri',
    ownerId,
    visibility: 'private',
    entryCount,
    updatedAt: '2026-10-10T10:00:00.000Z',
  };
}

async function open(): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      // Mounted below a parent path like the app does, so absolute navigation would miss.
      provideRouter([{ path: 'homebrew', children: homebrewRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  return RouterTestingHarness.create('/homebrew');
}

describe('PackListPage', () => {
  it('lists the user’s packs with their entry counts', async () => {
    const harness = await open();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/homebrew/packs')
      .flush([packJson('Amiri feats', 3)]);
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('Amiri feats');
      expect(text).toContain('3 entries');
    });
  });

  it('says so when the user has no packs', async () => {
    const harness = await open();
    TestBed.inject(HttpTestingController).expectOne('/api/homebrew/packs').flush([]);
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('No packs yet');
    });
  });

  it('opens the new pack under the feature route after create', async () => {
    const harness = await open();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/homebrew/packs').flush([]);
    await harness.fixture.whenStable();

    const root = present(harness.routeNativeElement);
    // Text comes from the route's `homebrew` message scope, loaded with the page's code.
    expect(root.textContent).toContain('New pack');
    const [title, slug] = [...root.querySelectorAll('input')];
    for (const [input, value] of [
      [present(title), 'Amiri feats'],
      [present(slug), 'amiri-feats'],
    ] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    harness.detectChanges();
    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    await harness.fixture.whenStable();

    const create = http.expectOne({ method: 'POST', url: '/api/homebrew/packs' });
    expect(create.request.body).toStrictEqual({ title: 'Amiri feats', slug: 'amiri-feats' });
    create.flush(packJson('Amiri feats', 0));

    const router = TestBed.inject(Router);
    await vi.waitFor(() => {
      expect(router.url).toBe(`/homebrew/${id}`);
    });
  });
});
