import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CHARACTER_NAMES } from '@pioneer/character/domain';
import type { GenerateCharacterBody } from '@pioneer/character/domain';
import { frontierMessages } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { characterRoutes } from '../../character.routes';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../../testing/provide-server-state-testing';

const id = '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10';
const elf = contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf'));

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

describe('CharacterListPage', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('opens the new character under the feature route after create', async () => {
    TestBed.configureTestingModule({
      providers: [
        // Mounted below a parent path like the app does, so absolute navigation would miss.
        provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
        ...provideServerStateTesting(),
        provideI18n({ en: async () => frontierMessages }),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/characters');
    http.expectOne('/api/characters').flush([]);
    await harness.fixture.whenStable();

    const root = present(harness.routeNativeElement);
    // Text comes from the route's `character` message scope, loaded with the page's code.
    expect(root.textContent).toContain('New character');
    const name = present(root.querySelector('input'));
    name.value = 'Merisiel';
    name.dispatchEvent(new Event('input'));
    // The aria listbox renders in an overlay; set the control's model the way a pick would.
    (
      harness.fixture.debugElement.query((element) => element.componentInstance instanceof PickerField)
        .componentInstance as PickerField<string, object>
    ).value.set(elf);
    harness.detectChanges();
    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    await harness.fixture.whenStable();

    http.expectOne({ method: 'POST', url: '/api/characters' }).flush({
      id,
      version: 1,
      ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
      name: 'Merisiel',
      build: { choices: { ancestry: elf } },
      level: 1,
      createdAt: '2026-10-07T10:00:00.000Z',
      updatedAt: '2026-10-07T10:00:00.000Z',
    });

    const router = TestBed.inject(Router);
    await vi.waitFor(() => {
      expect(router.url).toBe(`/characters/${id}`);
    });
  });

  it('generates a character from a level, with a rolled name, and shows the seed', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
        ...provideServerStateTesting(),
        provideI18n({ en: async () => frontierMessages }),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/characters');
    http.expectOne('/api/characters').flush([]);
    await harness.fixture.whenStable();

    const root = present(harness.routeNativeElement);
    const rolled = present(root.querySelector<HTMLInputElement>('pio-generate-character fr-refreshable-input input'));
    await vi.waitFor(() => {
      expect(CHARACTER_NAMES.entries).toContain(rolled.value);
    });
    const generate = present(root.querySelector<HTMLButtonElement>('pio-generate-character button[type="submit"]'));
    generate.click();
    await harness.fixture.whenStable();

    const request = http.expectOne({ method: 'POST', url: '/api/characters/generate' });
    const { level, name, seed } = request.request.body as GenerateCharacterBody;
    expect([level, name, seed]).toStrictEqual([1, rolled.value, undefined]);
    request.flush({
      seed: 4242,
      character: {
        id,
        version: 1,
        ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
        name: rolled.value,
        build: { choices: { ancestry: elf } },
        level: 1,
        createdAt: '2026-10-27T10:00:00.000Z',
        updatedAt: '2026-10-27T10:00:00.000Z',
      },
    });
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain('seed 4242');
    });
  });

  it('opens the names table in the drawer from the name field', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
        ...provideServerStateTesting(),
        provideI18n({ en: async () => frontierMessages }),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/characters');
    http.expectOne('/api/characters').flush([]);
    await harness.fixture.whenStable();

    const root = present(harness.routeNativeElement);
    const table = present(root.querySelector<HTMLButtonElement>('pio-generate-character [frAction] button'));
    table.click();
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.querySelectorAll('fr-drawer pio-roll-table fr-list-item')).toHaveLength(
        CHARACTER_NAMES.entries.length,
      );
    });
  });
});
