import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterId,
  CharacterLevel,
  CharacterName,
  CharacterPatchField,
  CharacterSort,
} from '@pioneer/character/domain';
import type { CharacterPatch, PatchCharacterBody } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { AncestryId, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import {
  FIRST_VERSION,
  fixedClock,
  newId,
  NotFoundError,
  SortDirection,
  UserId,
  ValidationError,
  Version,
  VersionConflictError,
} from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const kyra = CharacterName.parse('Kyra');
const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const byName = { sort: CharacterSort.Name, direction: SortDirection.Asc } as const;

/** An edit to a character still at its first version. */
function firstVersion(patch: CharacterPatch): PatchCharacterBody {
  return { expectedVersion: FIRST_VERSION, patch };
}

describe('CharacterService', () => {
  let service: CharacterService;

  beforeEach(() => {
    const content = new ContentRegistry();
    content.register(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));
  });

  test('create assigns a UUIDv4 row id and the actor as owner; patch bumps the version', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    expect(created.id[14]).toBe('4');
    expect(created.ownerId).toBe(amiri);
    const patched = await service.patch(
      amiri,
      created.id,
      firstVersion({
        field: CharacterPatchField.Level,
        value: CharacterLevel.parse(2),
      }),
    );
    expect(patched.version).toBe(Version.parse(2));
    expect(patched.level).toBe(CharacterLevel.parse(2));
  });

  test('stale version is a conflict', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    await service.patch(
      amiri,
      created.id,
      firstVersion({
        field: CharacterPatchField.Name,
        value: CharacterName.parse('Kyra II'),
      }),
    );
    const stale = service.patch(
      amiri,
      created.id,
      firstVersion({
        field: CharacterPatchField.Level,
        value: CharacterLevel.parse(3),
      }),
    );
    expect(await rejection(stale)).toBeInstanceOf(VersionConflictError);
  });

  test('unknown ancestry is rejected', async () => {
    const unknown = AncestryId.parse(newId());
    const created = service.create(amiri, { name: CharacterName.parse('X'), ancestry: unknown });
    const error = await rejection(created);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues).toStrictEqual([
      { path: ['ancestry'], message: { key: 'character.validation.unknownAncestry', params: { ancestry: unknown } } },
    ]);
  });

  test('missing character is not found', async () => {
    const missing = CharacterId.parse(newId());
    const error = await rejection(service.get(amiri, missing));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: 'problem.notFound' });
  });
});

describe('CharacterService ownership', () => {
  let service: CharacterService;

  beforeEach(() => {
    const content = new ContentRegistry();
    content.register(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));
  });

  test('list holds only the actor’s characters', async () => {
    await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    await service.create(ezren, { name: CharacterName.parse('Seelah'), ancestry: humanAncestryId });
    const listed = await service.list(amiri, byName);
    expect(listed.map((character) => character.name)).toStrictEqual([kyra]);
  });

  test('another user’s character reads as not found', async () => {
    const theirs = await service.create(ezren, { name: kyra, ancestry: humanAncestryId });
    const error = await rejection(service.get(amiri, theirs.id));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: 'problem.notFound' });
  });

  test('another user’s character cannot be patched, even with an invalid edit', async () => {
    const theirs = await service.create(ezren, { name: kyra, ancestry: humanAncestryId });
    const unknownAncestry = AncestryId.parse(newId());
    const edit = firstVersion({ field: CharacterPatchField.Ancestry, value: unknownAncestry });
    const edited = service.patch(amiri, theirs.id, edit);
    expect(await rejection(edited)).toBeInstanceOf(NotFoundError);
    const unchanged = await service.get(ezren, theirs.id);
    expect(unchanged.version).toBe(FIRST_VERSION);
  });
});
