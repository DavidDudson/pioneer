import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { briarRoseExport, mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { contentId, PackId, Slug } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { characterRoutes } from '../../character.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

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

async function openPage(): Promise<OpenPage> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
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

describe('PathbuilderImportPage', () => {
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
    expect(root.textContent).toContain('Ancestry · 0 of 1 matched');
    expect(root.textContent).toContain('Feats · 0 of 32 matched');
  });

  it('explains text that is not a Pathbuilder export', async () => {
    const { harness, root } = await openPage();

    await paste(harness, root, '{ "hello": "world" }');

    expect(present(root.querySelector('[role="alert"]')).textContent).toContain("isn't a Pathbuilder export");
    expect(root.textContent).not.toContain('What Pioneer read');
  });
});

const id = '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10';
const human = contentId(PackId.parse('player-core'), Slug.parse('human'));

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
    request.flush({
      character: {
        id,
        version: 1,
        ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
        name: 'Mordred (Dual Class)',
        ancestry: human,
        level: 12,
        attributes: { str: 4, dex: 0, con: 2, int: 1, wis: 3, cha: 6 },
        createdAt: '2026-10-07T10:00:00.000Z',
        updatedAt: '2026-10-07T10:00:00.000Z',
      },
      report: {
        unmatched: [{ kind: 'heritage', names: [{ name: 'Changeling', occurrences: 1, reason: 'kind-not-loaded' }] }],
        notCarried: ['heritage', 'lore'],
      },
    });

    const router = TestBed.inject(Router);
    await vi.waitFor(() => {
      expect(router.url).toBe(`/characters/${id}`);
    });
    const sheet = present(harness.routeNativeElement);
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(sheet.textContent).toContain('Imported from Pathbuilder');
    });
    expect(sheet.textContent).toContain('Heritage and Lores');
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
