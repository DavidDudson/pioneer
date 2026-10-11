import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ANCESTRY_SLOT, Character, CharacterId, CharacterLevel, CharacterPatchField } from '@pioneer/character/domain';
import { ChoiceValue, contentId, EntrySlug, PackId, SlotKey } from '@pioneer/rules/sdk';
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
    ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
    name: 'Merisiel',
    build: {
      choices: {
        ancestry: contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf')),
        'boost:1:free:0': 'dex',
      },
    },
    level,
    createdAt: '2026-10-07T10:00:00.000Z',
    updatedAt: '2026-10-07T10:00:00.000Z',
  };
}

/** The sheet the server sends: the character, and a filled ancestry slot. */
function sheet(version: number, level: number): Record<string, unknown> {
  const character = wire(version, level);
  const {
    choices: { ancestry },
  } = character['build'] as { choices: { ancestry: string } };
  return {
    character,
    slots: [{ status: 'filled', key: 'ancestry', subject: { kind: 'root', content: 'ancestry' }, selection: ancestry }],
  };
}

/** A PATCH's answer: the sheet, and the picks the edit cleared. */
function patched(version: number, level: number, cleared: readonly object[] = []): Record<string, unknown> {
  return { ...sheet(version, level), cleared };
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
    http.expectOne(`/api/characters/${id}`).flush(sheet(1, 1));
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
    expect(store.selected()).toBeInstanceOf(Character);
    expect(store.selected()?.document.build.choices[SlotKey.parse('boost:1:free:0')]).toBe('dex');
  });

  it('keeps the slots the server read with the character', async () => {
    await loadSelected();
    expect(store.slots()?.map(({ key, status }) => [key, status])).toStrictEqual([['ancestry', 'filled']]);
  });

  it('patch sends the expected version and adopts the server result', async () => {
    await loadSelected();
    const pending = store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) });
    const request = http.expectOne({ method: 'PATCH', url: `/api/characters/${id}` });
    expect(request.request.body).toStrictEqual({ expectedVersion: 1, patch: { field: 'level', value: 2 } });
    request.flush(patched(2, 2));
    await pending;
    expect(store.selected()?.version).toBe(2);
  });

  it('selectSlot and clearSlot send slot edits', async () => {
    await loadSelected();
    const human = ChoiceValue.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:human')));
    const selecting = store.selectSlot(ANCESTRY_SLOT, human);
    const select = http.expectOne({ method: 'PATCH', url: `/api/characters/${id}` });
    expect(select.request.body).toStrictEqual({
      expectedVersion: 1,
      patch: { field: 'selectSlot', slot: 'ancestry', selection: human },
    });
    select.flush(patched(2, 1));
    await selecting;

    const clearing = store.clearSlot(ANCESTRY_SLOT);
    const clear = http.expectOne({ method: 'PATCH', url: `/api/characters/${id}` });
    expect(clear.request.body).toStrictEqual({ expectedVersion: 2, patch: { field: 'clearSlot', slot: 'ancestry' } });
    clear.flush(patched(3, 1));
    await clearing;
    expect(store.selected()?.version).toBe(3);
  });

  it('keeps the picks an edit cleared until dismissed, and drops them with the next edit', async () => {
    await loadSelected();
    const rockDwarf = { key: 'heritage', selection: 'rock-dwarf', selectionName: 'Rock Dwarf' };
    const selecting = store.selectSlot(ANCESTRY_SLOT, ChoiceValue.parse('elf'));
    http.expectOne({ method: 'PATCH' }).flush(patched(2, 1, [rockDwarf]));
    await selecting;
    expect(store.cleared()).toStrictEqual([rockDwarf]);
    store.dismissCleared();
    expect(store.cleared()).toStrictEqual([]);

    const again = store.selectSlot(ANCESTRY_SLOT, ChoiceValue.parse('dwarf'));
    http.expectOne({ method: 'PATCH' }).flush(patched(3, 1, [rockDwarf]));
    await again;
    const levelling = store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) });
    http.expectOne({ method: 'PATCH' }).flush(patched(4, 2));
    await levelling;
    expect(store.cleared()).toStrictEqual([]);
  });

  it('a conflict rethrows and reloads the latest version', async () => {
    await loadSelected();
    const pending = store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) });
    http
      .expectOne({ method: 'PATCH' })
      .flush({ type: 'version-conflict', title: 'Changed', status: 409 }, { status: 409, statusText: 'Conflict' });
    // The conflict refetches the character before the save reports it, so the field can show theirs.
    await vi.waitFor(() => {
      http.expectOne({ method: 'GET', url: `/api/characters/${id}` }).flush(sheet(3, 5));
    });
    await expect(pending).rejects.toSatisfy((error: unknown) => ApiError.isConflict(error));
    expect(store.selected()?.version).toBe(3);
  });

  it('drops a cleared-pick notice when the next edit is refused', async () => {
    await loadSelected();
    const selecting = store.selectSlot(ANCESTRY_SLOT, ChoiceValue.parse('elf'));
    http
      .expectOne({ method: 'PATCH' })
      .flush(patched(2, 1, [{ key: 'heritage', selection: 'rock-dwarf', selectionName: 'Rock Dwarf' }]));
    await selecting;
    const pending = store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) });
    http
      .expectOne({ method: 'PATCH' })
      .flush({ type: 'version-conflict', title: 'Changed', status: 409 }, { status: 409, statusText: 'Conflict' });
    await vi.waitFor(() => {
      http.expectOne({ method: 'GET', url: `/api/characters/${id}` }).flush(sheet(3, 5));
    });
    await expect(pending).rejects.toSatisfy((error: unknown) => ApiError.isConflict(error));
    expect(store.cleared()).toStrictEqual([]);
  });
});
