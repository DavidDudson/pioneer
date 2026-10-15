import { HttpTestingController } from '@angular/common/http/testing';
import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { briarRoseExport, mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { officialPacks } from '@pioneer/rules/catalog';
import { MemoryBundleStore } from '@pioneer/rules/data-access';
import { provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { IDLE_SCHEDULER, provideI18n } from '@pioneer/shared/web';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { characterRoutes } from '../../character.routes';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../../testing/provide-server-state-testing';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

interface OpenPage {
  readonly harness: RouterTestingHarness;
  readonly root: HTMLElement;
}

/** Opens the import page; `content` replaces where its content comes from. */
async function openPage(content: readonly Provider[] = []): Promise<OpenPage> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
      ...content,
    ],
  });
  const harness = await RouterTestingHarness.create('/characters/import/pathbuilder');
  await harness.fixture.whenStable();
  return { harness, root: present(harness.routeNativeElement) };
}

async function paste(harness: RouterTestingHarness, root: HTMLElement, text: string): Promise<void> {
  const area = present(root.querySelector('textarea'));
  area.value = text;
  area.dispatchEvent(new Event('input'));
  harness.detectChanges();
  await harness.fixture.whenStable();
}

/** Idle work (prefetching likely next kinds) left out, so one visit's requests never land in the next's. */
const noIdleWork: Provider = { provide: IDLE_SCHEDULER, useValue: (): void => undefined };

describe('PathbuilderImportPage', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
    await prebuildServerStateTesting([], officialPacks);
  }, PREBUILD_TIMEOUT);

  it('shows what it read from a pasted export', async () => {
    const { harness, root } = await openPage();

    await paste(harness, root, JSON.stringify(briarRoseExport));

    expect(root.textContent).toContain('Briar Rose');
    expect(root.textContent).toContain('Animist and Druid');
    expect(root.textContent).toContain('+5');
  });

  it('reports the names against loaded packs', async () => {
    const { harness, root } = await openPage();

    await paste(harness, root, JSON.stringify(briarRoseExport));

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain('names match content you have loaded');
    });
    expect(root.textContent).toContain('Ancestry · 1 of 1 matched');
    expect(root.textContent).toContain('Heritage · 1 of 1 matched');
    expect(root.textContent).toContain('Feats · 1 of 32 matched');
  });

  it('matches against content kept from an earlier visit while offline', async () => {
    const store = new MemoryBundleStore();
    const delivery = new TestContentDelivery(officialPacks);
    const online = await openPage([...provideContentTesting(delivery, store), noIdleWork]);
    await paste(online.harness, online.root, JSON.stringify(mordredExport));
    await vi.waitFor(() => {
      online.harness.detectChanges();
      expect(online.root.textContent).toContain('Ancestry · 1 of 1 matched');
    });
    TestBed.resetTestingModule();
    delivery.offline = true;
    const seen = delivery.requests.length;

    const offline = await openPage([...provideContentTesting(delivery, store), noIdleWork]);
    await paste(offline.harness, offline.root, JSON.stringify(mordredExport));

    await vi.waitFor(() => {
      offline.harness.detectChanges();
      expect(offline.root.textContent).toContain('Ancestry · 1 of 1 matched');
    });
    // Only the manifest was asked for, and it failed: every bundle came from the store.
    expect(delivery.requests.slice(seen)).toStrictEqual(['manifest']);
  });

  it('explains text that is not a Pathbuilder export', async () => {
    const { harness, root } = await openPage();

    await paste(harness, root, '{ "hello": "world" }');

    expect(present(root.querySelector('[role="alert"]')).textContent).toContain("isn't a Pathbuilder export");
    expect(root.textContent).not.toContain('What Pioneer read');
  });
});

const id = '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10';
const human = contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:human'));

function button(root: HTMLElement, label: string): HTMLButtonElement {
  return present([...root.querySelectorAll('button')].find((element) => element.textContent.includes(label)));
}

describe('PathbuilderImportPage create', () => {
  it('sends the export, opens the new character and shows the report until dismissed', async () => {
    const { harness, root } = await openPage();
    const http = TestBed.inject(HttpTestingController);
    await paste(harness, root, JSON.stringify(mordredExport));

    button(root, 'Create character').click();
    await harness.fixture.whenStable();
    const request = http.expectOne({ method: 'POST', url: '/api/characters/import/pathbuilder' });
    expect(request.request.body).toStrictEqual(mordredExport);
    const character = {
      id,
      version: 1,
      ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
      name: 'Mordred (Dual Class)',
      build: { choices: { ancestry: human } },
      level: 12,
      createdAt: '2026-10-07T10:00:00.000Z',
      updatedAt: '2026-10-07T10:00:00.000Z',
    };
    request.flush({
      character,
      report: {
        unmatched: [{ kind: 'heritage', names: [{ name: 'Changeling', occurrences: 1, reason: 'not-offered' }] }],
        notCarried: ['class-feature', 'lore'],
        unplacedBoosts: [],
        modifierDifferences: [],
      },
    });

    const router = TestBed.inject(Router);
    // The sheet route loads lazily, with the engine behind it, which takes longer than a second on a slow runner.
    await vi.waitFor(
      () => {
        expect(router.url).toBe(`/characters/${id}/plan`);
      },
      { timeout: 3000 },
    );
    // The sheet reads the new character's slots from the server.
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'GET', url: `/api/characters/${id}` })
        .flush({ character, slots: [], languages: { known: [], open: 0 } });
    });
    const sheet = present(harness.routeNativeElement);
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(sheet.textContent).toContain('Imported from Pathbuilder');
      expect(sheet.querySelector('fr-inline-field button')).not.toBeNull();
    });
    expect(sheet.textContent).toContain('Class features and Lores');
    expect(sheet.textContent).toContain('Heritage · 1 not carried over');
    expect(sheet.textContent).toContain('Changeling');

    button(sheet, 'Dismiss').click();
    harness.detectChanges();
    expect(sheet.textContent).not.toContain('Imported from Pathbuilder');
    // The focused Dismiss button is gone; focus lands on the first identity field, not the page body.
    await vi.waitFor(() => {
      expect(document.activeElement?.closest('fr-inline-field')).not.toBeNull();
    });
  });

  it('shows the server’s reason when the ancestry is not loaded', async () => {
    const { harness, root } = await openPage();
    const http = TestBed.inject(HttpTestingController);
    await paste(harness, root, JSON.stringify(briarRoseExport));

    button(root, 'Create character').click();
    await harness.fixture.whenStable();
    http.expectOne({ method: 'POST', url: '/api/characters/import/pathbuilder' }).flush(
      {
        type: 'validation',
        title: 'Validation failed',
        status: 422,
        message: { key: 'problem.validation' },
        issues: [
          {
            path: ['build', 'ancestry'],
            message: { key: 'character.validation.unmatchedAncestry', params: { ancestry: 'Goloma' } },
          },
        ],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain('No loaded content has the ancestry Goloma');
    });
  });
});
