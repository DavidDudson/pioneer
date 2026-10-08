import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CharacterId, CharacterLevel, CharacterPatchField } from '@pioneer/character/domain';
import { contentId, PackId, Slug } from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideServerStateTesting } from '../testing/provide-server-state-testing';
import { CharacterStore } from './character-store';

const id = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

interface WireCharacter {
  readonly id: string;
  readonly version: number;
  readonly level: number;
}

function wire(version: number, level: number): WireCharacter & Record<string, unknown> {
  return {
    id,
    version,
    name: 'Merisiel',
    ancestry: contentId(PackId.parse('player-core'), Slug.parse('elf')),
    level,
    attributes: { str: 0, dex: 4, con: 1, int: 0, wis: 0, cha: 1 },
    createdAt: '2026-10-07T10:00:00.000Z',
    updatedAt: '2026-10-07T10:00:00.000Z',
  };
}

async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

describe(CharacterStore, () => {
  let store: CharacterStore;
  let http: HttpTestingController;

  async function loadSelected(): Promise<void> {
    store.select(id);
    TestBed.tick();
    http.expectOne(`/api/characters/${id}`).flush(wire(1, 1));
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CharacterStore, ...provideServerStateTesting()],
    });
    store = TestBed.inject(CharacterStore);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/api/characters').flush([]);
  });

  it('decodes the selected character into a class', async () => {
    await loadSelected();
    expect(store.selected()?.modifier('dex')).toBe(4);
  });

  it('patch sends the expected version and adopts the server result', async () => {
    await loadSelected();
    const pending = store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) });
    const request = http.expectOne({ method: 'PATCH', url: `/api/characters/${id}` });
    expect(request.request.body).toStrictEqual({ expectedVersion: 1, patch: { field: 'level', value: 2 } });
    request.flush(wire(2, 2));
    await pending;
    expect(store.selected()?.version).toBe(2);
  });

  it('a conflict rethrows and reloads the latest version', async () => {
    await loadSelected();
    const pending = store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) });
    http
      .expectOne({ method: 'PATCH' })
      .flush({ type: 'version-conflict', title: 'Changed', status: 409 }, { status: 409, statusText: 'Conflict' });
    // The conflict refetches the character before the save reports it, so the field can show theirs.
    await vi.waitFor(() => {
      http.expectOne({ method: 'GET', url: `/api/characters/${id}` }).flush(wire(3, 5));
    });
    await expect(pending).rejects.toSatisfy((error: unknown) => ApiError.isConflict(error));
    expect(store.selected()?.version).toBe(3);
  });
});
