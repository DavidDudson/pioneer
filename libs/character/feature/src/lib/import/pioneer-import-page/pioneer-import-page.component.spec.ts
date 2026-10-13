import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { characterRoutes } from '../../character.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const PREVIEW_URL = '/api/characters/import/pioneer/preview';
const file = { format: 'pioneer-character', formatVersion: 1, character: { name: 'Kyra' } };

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
  const harness = await RouterTestingHarness.create('/characters/import/pioneer');
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

function button(root: HTMLElement, label: string): HTMLButtonElement {
  return present([...root.querySelectorAll('button')].find((element) => element.textContent.includes(label)));
}

describe('PioneerImportPage', () => {
  it('explains text that is not JSON without asking the server', async () => {
    const { harness, root } = await openPage();
    const http = TestBed.inject(HttpTestingController);

    await paste(harness, root, 'not json');

    expect(present(root.querySelector('[role="alert"]')).textContent).toContain("isn't a Pioneer character file");
    http.expectNone(PREVIEW_URL);
  });

  it('previews a pasted file with the content no loaded pack has, by kind', async () => {
    const { harness, root } = await openPage();
    const http = TestBed.inject(HttpTestingController);

    await paste(harness, root, JSON.stringify(file));
    const request = http.expectOne({ method: 'POST', url: PREVIEW_URL });
    expect(request.request.body).toStrictEqual(file);
    request.flush({
      name: 'Kyra',
      level: 3,
      homebrew: [],
      unmatched: [{ kind: 'weapon', entries: [{ source: 'player-core', slug: 'weapon:longsword' }] }],
    });

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain('Kyra');
      expect(root.textContent).toContain('1 thing in this file is not in your loaded content');
    });
    expect(root.textContent).toContain('Weapons · 1 not found');
    expect(root.textContent).toContain('longsword (player-core)');
  });

  it('shows the homebrew in the file, with its clashes', async () => {
    const { harness, root } = await openPage();
    const http = TestBed.inject(HttpTestingController);

    await paste(harness, root, JSON.stringify(file));
    http.expectOne({ method: 'POST', url: PREVIEW_URL }).flush({
      name: 'Kyra',
      level: 3,
      homebrew: [
        {
          pack: 'moon-brew',
          title: 'Moon brew',
          publisher: 'Amiri',
          status: 'own',
          entries: [
            { slug: 'feat:lunar-grace', name: 'Lunar Grace', outcome: 'reuse' },
            { slug: 'weapon:moon-blade', name: 'Moon Blade', outcome: 'clash' },
            { slug: 'weapon:moon-dagger', name: 'Moon Dagger', outcome: 'create' },
          ],
        },
      ],
      unmatched: [],
    });

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain('Homebrew in this file');
    });
    expect(root.textContent).toContain('Moon brew by Amiri (moon-brew)');
    expect(root.textContent).toContain('1 entry clashes with a different entry already here');
  });

  it("shows the server's reason when it can't read the file", async () => {
    const { harness, root } = await openPage();
    const http = TestBed.inject(HttpTestingController);

    await paste(harness, root, JSON.stringify({ ...file, formatVersion: 99 }));
    http.expectOne({ method: 'POST', url: PREVIEW_URL }).flush(
      {
        type: 'validation',
        title: 'Validation failed',
        status: 422,
        message: { key: 'problem.validation' },
        issues: [{ path: [], message: { key: 'character.import.pioneer.problem.newerFormat' } }],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(present(root.querySelector('[role="alert"]')).textContent).toContain('newer Pioneer');
    });
    expect(root.textContent).not.toContain('Create character');
  });

  it('cancels back to an empty page', async () => {
    const { harness, root } = await openPage();
    const http = TestBed.inject(HttpTestingController);
    await paste(harness, root, JSON.stringify(file));
    http.expectOne({ method: 'POST', url: PREVIEW_URL }).flush({ name: 'Kyra', level: 1, homebrew: [], unmatched: [] });
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain('Everything this character uses is in your loaded content');
    });

    button(root, 'Cancel').click();
    harness.detectChanges();

    expect(present(root.querySelector('textarea')).value).toBe('');
    expect(root.textContent).not.toContain('Create character');
  });

  it('sends the file itself to create the character', async () => {
    const { harness, root } = await openPage();
    const http = TestBed.inject(HttpTestingController);
    await paste(harness, root, JSON.stringify(file));
    http.expectOne({ method: 'POST', url: PREVIEW_URL }).flush({ name: 'Kyra', level: 1, homebrew: [], unmatched: [] });
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain('Create character');
    });

    button(root, 'Create character').click();
    await harness.fixture.whenStable();

    const request = http.expectOne({ method: 'POST', url: '/api/characters/import/pioneer' });
    expect(request.request.body).toStrictEqual(file);
  });
});
