import { HttpTestingController } from '@angular/common/http/testing';
import type { TestRequest } from '@angular/common/http/testing';
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

const playerCore = {
  id: '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e60',
  slug: 'player-core',
  title: 'Player Core',
  publisher: 'Paizo',
  visibility: 'public',
  official: true,
};
const monsterCore = {
  id: '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e61',
  slug: 'monster-core',
  title: 'Monster Core',
  publisher: 'Paizo',
  visibility: 'public',
  official: true,
};

interface DependenciesJson {
  readonly editable: boolean;
  readonly dependencies: readonly object[];
  readonly candidates: readonly object[];
}

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

/** Every button whose text starts with `label`, in document order. */
function buttons(root: HTMLElement, label: string): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter((candidate) => candidate.textContent.trim().startsWith(label));
}

/** Opens the pack home and answers its two loads: the pack, and `dependencies`. */
async function open(dependencies: DependenciesJson): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'homebrew', children: homebrewRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/homebrew/${id}`);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`/api/homebrew/packs/${id}`).flush(loadedPack);
  await vi.waitFor(() => {
    http.expectOne(`/api/homebrew/packs/${id}/dependencies`).flush(dependencies);
  });
  await harness.fixture.whenStable();
  return harness;
}

/** The request the last press sent, which goes out a tick after the press. */
async function sent(url: string): Promise<TestRequest> {
  return vi.waitFor(() => TestBed.inject(HttpTestingController).expectOne(url));
}

function pickerField(harness: RouterTestingHarness): DebugElement {
  const [field] = harness.fixture.debugElement.queryAll((each) => each.componentInstance instanceof PickerField);
  return present(field);
}

describe('PackDependenciesPanel', () => {
  it('lists what the pack extends, with the official ones marked', async () => {
    const harness = await open({ editable: true, dependencies: [playerCore], candidates: [] });

    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('Player Core');
      expect(text).toContain('By Paizo');
      expect(text).toContain('Official');
    });
  });

  it('says when the pack extends nothing', async () => {
    const harness = await open({ editable: true, dependencies: [], candidates: [playerCore] });

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('This pack extends nothing.');
    });
  });

  it('offers a reader the list and nothing to change', async () => {
    const harness = await open({ editable: false, dependencies: [playerCore], candidates: [] });

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Player Core');
    });
    const root = present(harness.routeNativeElement);
    expect(buttons(root, 'Remove')).toHaveLength(0);
    expect(root.querySelector('button[type="submit"]')).toBeNull();
  });

  it('removes a dependency on the first press, and the list follows', async () => {
    const harness = await open({ editable: true, dependencies: [playerCore], candidates: [] });
    await vi.waitFor(() => {
      expect(buttons(present(harness.routeNativeElement), 'Remove')).toHaveLength(1);
    });

    present(buttons(present(harness.routeNativeElement), 'Remove')[0]).click();
    const request = await sent(`/api/homebrew/packs/${id}/dependencies/${playerCore.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ editable: true, dependencies: [], candidates: [playerCore] });
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('This pack extends nothing.');
    });
  });

  it('names the entries that still use a dependency it cannot remove', async () => {
    const harness = await open({ editable: true, dependencies: [playerCore], candidates: [] });
    await vi.waitFor(() => {
      expect(buttons(present(harness.routeNativeElement), 'Remove')).toHaveLength(1);
    });

    present(buttons(present(harness.routeNativeElement), 'Remove')[0]).click();
    const removal = await sent(`/api/homebrew/packs/${id}/dependencies/${playerCore.id}`);
    removal.flush(
      {
        type: 'conflict',
        title: 'Conflict',
        status: 409,
        message: { key: 'homebrew.pack.dependencyInUse', params: { entries: 'Axe Rush, Whirling Strike' } },
      },
      { status: 409, statusText: 'Conflict' },
    );
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('Axe Rush, Whirling Strike');
      expect(text).toContain('Player Core');
    });
  });

  it('adds the picked pack and shows it', async () => {
    const harness = await open({ editable: true, dependencies: [], candidates: [playerCore, monsterCore] });
    await vi.waitFor(() => {
      expect(pickerField(harness)).toBeDefined();
    });

    (pickerField(harness).componentInstance as PickerField<string, object>).value.set(playerCore.id);
    await harness.fixture.whenStable();
    present(present(harness.routeNativeElement).querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    const request = await sent(`/api/homebrew/packs/${id}/dependencies`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toStrictEqual({ dependsOn: playerCore.id });
    request.flush({ editable: true, dependencies: [playerCore], candidates: [monsterCore] });
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Player Core');
    });
    const picker = pickerField(harness).componentInstance as PickerField<string, { readonly id: string }>;
    expect(picker.rows().map((row) => row.id)).toStrictEqual([monsterCore.id]);
  });

  it('says why a pack cannot be added when the server refuses', async () => {
    const harness = await open({ editable: true, dependencies: [], candidates: [playerCore] });
    await vi.waitFor(() => {
      expect(pickerField(harness)).toBeDefined();
    });

    (pickerField(harness).componentInstance as PickerField<string, object>).value.set(playerCore.id);
    await harness.fixture.whenStable();
    present(present(harness.routeNativeElement).querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    const addition = await sent(`/api/homebrew/packs/${id}/dependencies`);
    addition.flush(
      {
        type: 'conflict',
        title: 'Conflict',
        status: 409,
        message: { key: 'homebrew.pack.dependencyNarrower', params: { dependency: 'Player Core' } },
      },
      { status: 409, statusText: 'Conflict' },
    );
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain(
        'This pack is visible to more people than Player Core.',
      );
    });
  });

  it('says so when nothing is left to add', async () => {
    const harness = await open({ editable: true, dependencies: [playerCore], candidates: [] });

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('No other pack can be added right now.');
    });
  });

  it('says when the dependencies cannot be loaded', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'homebrew', children: homebrewRoutes }], withComponentInputBinding()),
        ...provideServerStateTesting(),
        provideI18n({ en: async () => frontierMessages }),
      ],
    });
    const harness = await RouterTestingHarness.create(`/homebrew/${id}`);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`/api/homebrew/packs/${id}`).flush(loadedPack);
    await vi.waitFor(() => {
      http
        .expectOne(`/api/homebrew/packs/${id}/dependencies`)
        .flush({ type: 'internal', title: 'Error', status: 500 }, { status: 500, statusText: 'Server Error' });
    });
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Could not load the packs this one extends.');
    });
  });
});
