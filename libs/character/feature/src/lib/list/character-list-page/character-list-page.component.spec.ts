import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Select } from '@pioneer/frontier';
import { contentId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { characterRoutes } from '../../character.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10';
const elf = contentId('player-core', 'elf');

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

describe('CharacterListPage', () => {
  it('opens the new character under the feature route after create', async () => {
    TestBed.configureTestingModule({
      providers: [
        // Mounted below a parent path like the app does, so absolute navigation would miss.
        provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
        ...provideServerStateTesting(),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/characters');
    http.expectOne('/api/characters').flush([]);
    await harness.fixture.whenStable();

    const root = present(harness.routeNativeElement);
    const name = present(root.querySelector('input'));
    name.value = 'Merisiel';
    name.dispatchEvent(new Event('input'));
    // The aria listbox renders in an overlay; set the control's model the way a pick would.
    (harness.fixture.debugElement.query(By.directive(Select)).componentInstance as Select<string>).value.set(elf);
    harness.detectChanges();
    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    await harness.fixture.whenStable();

    http.expectOne({ method: 'POST', url: '/api/characters' }).flush({
      id,
      version: 1,
      name: 'Merisiel',
      ancestry: elf,
      level: 1,
      attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      createdAt: '2026-10-07T10:00:00.000Z',
      updatedAt: '2026-10-07T10:00:00.000Z',
    });

    const router = TestBed.inject(Router);
    await vi.waitFor(() => {
      expect(router.url).toBe(`/characters/${id}`);
    });
  });
});
