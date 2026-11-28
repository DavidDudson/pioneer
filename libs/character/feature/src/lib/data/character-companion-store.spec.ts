import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CharacterId, CompanionId, CompanionName, CORE_RULE_LIMITS } from '@pioneer/character/domain';
import { ContentId, contentId, EntrySlug, PackId, SlotKey } from '@pioneer/rules/sdk';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JsonObject } from '../testing/json-fixture';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { CharacterCompanionStore } from './character-companion-store';
import { CharacterStore } from './character-store';

const id = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');
const wolf = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('companion-species:wolf')));
const elf = contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf'));
const slot = SlotKey.parse('class-feat-1:0');

function sheet(version: number): JsonObject {
  return {
    character: {
      id,
      version,
      ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
      name: 'Amiri',
      build: { choices: { ancestry: elf, 'boost:1:free:0': 'dex' } },
      level: 1,
      createdAt: '2026-10-07T10:00:00.000Z',
      updatedAt: '2026-10-07T10:00:00.000Z',
    },
    slots: [{ status: 'filled', key: 'ancestry', subject: { kind: 'root', content: 'ancestry' }, selection: elf }],
    languages: { known: [], open: 0 },
  };
}

function companion(name: string): JsonObject {
  return {
    id: 'a3c1f1d2-5e44-4c7b-8c1a-7d9b3e2f4a10',
    characterId: id,
    kind: 'animal-companion',
    name,
    form: { species: wolf },
    grantedBy: slot,
    createdAt: '2026-10-07T10:00:00.000Z',
    updatedAt: '2026-10-07T10:00:00.000Z',
  };
}

/** Lets the selected character's companions query start, now that the character has loaded. */
async function untilQueried(): Promise<void> {
  TestBed.tick();
  await Promise.resolve();
  TestBed.tick();
}

/** Answers the reads of the open character that follow a write, until the write is done. */
async function finish(write: Promise<void>): Promise<void> {
  let done = false;

  const tracked = (async (): Promise<void> => {
    await write;
    done = true;
  })();

  await vi.waitFor(() => {
    TestBed.tick();

    for (const request of TestBed.inject(HttpTestingController).match((candidate) => candidate.method === 'GET')) {
      request.flush({ sheet: sheet(2), ruleLimits: CORE_RULE_LIMITS });
    }

    if (!done) {
      throw new Error('The write is still pending');
    }
  });

  await tracked;
}

async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

describe(CharacterCompanionStore, () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  let store: CharacterCompanionStore;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [CharacterStore, CharacterCompanionStore, ...provideServerStateTesting()],
    });
    const characters = TestBed.inject(CharacterStore);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    characters.select(id);
    TestBed.tick();
    http.expectOne(`/api/characters/${id}/sheet`).flush({ sheet: sheet(1), ruleLimits: CORE_RULE_LIMITS });
    await settle();
    store = TestBed.inject(CharacterCompanionStore);
  });

  it('reads the open character’s companions', async () => {
    await untilQueried();
    http.expectOne(`/api/characters/${id}/companions`).flush({ companions: [companion('Fang')] });
    await settle();

    expect(store.companions.data()?.companions.map(({ name }) => name)).toStrictEqual(['Fang']);
  });

  it('adds a companion with the version it read, and answers with the list the server sends', async () => {
    await untilQueried();
    http.expectOne(`/api/characters/${id}/companions`).flush({ companions: [] });
    await settle();

    const adding = store.addAnimalCompanion({ name: CompanionName.parse('Fang'), species: wolf, grantedBy: slot });
    const request = http.expectOne({ method: 'POST', url: `/api/characters/${id}/companions` });
    expect(request.request.body).toStrictEqual({
      kind: 'animal-companion',
      name: 'Fang',
      form: { species: wolf },
      grantedBy: slot,
      expectedVersion: 1,
    });
    request.flush({ companions: [companion('Fang')] });
    await finish(adding);

    expect(store.companions.data()?.companions).toHaveLength(1);
  });

  it('archives a companion as replaced with the version it read', async () => {
    await untilQueried();
    http.expectOne(`/api/characters/${id}/companions`).flush({ companions: [companion('Fang')] });
    await settle();

    const archiving = store.archive(CompanionId.parse('a3c1f1d2-5e44-4c7b-8c1a-7d9b3e2f4a10'), 'replaced');

    const request = http.expectOne({
      method: 'POST',
      url: `/api/characters/${id}/companions/a3c1f1d2-5e44-4c7b-8c1a-7d9b3e2f4a10/archive`,
    });

    expect(request.request.body).toStrictEqual({ reason: 'replaced', expectedVersion: 1 });
    request.flush({ companions: [] });
    await finish(archiving);

    expect(store.companions.data()?.companions).toStrictEqual([]);
  });
});
