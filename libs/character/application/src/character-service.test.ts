import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterId, CharacterLevel, CharacterName, CharacterPatchField } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { AncestryId, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import {
  FIRST_VERSION,
  fixedClock,
  newId,
  NotFoundError,
  ValidationError,
  Version,
  VersionConflictError,
} from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const kyra = CharacterName.parse('Kyra');

describe('CharacterService', () => {
  let service: CharacterService;

  beforeEach(() => {
    const content = new ContentRegistry();
    content.register(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));
  });

  test('create assigns a UUIDv4 row id; patch bumps the version', async () => {
    const created = await service.create({ name: kyra, ancestry: humanAncestryId });
    expect(created.id[14]).toBe('4');
    const patched = await service.patch(created.id, FIRST_VERSION, {
      field: CharacterPatchField.Level,
      value: CharacterLevel.parse(2),
    });
    expect(patched.version).toBe(Version.parse(2));
    expect(patched.level).toBe(CharacterLevel.parse(2));
  });

  test('stale version is a conflict', async () => {
    const created = await service.create({ name: kyra, ancestry: humanAncestryId });
    await service.patch(created.id, FIRST_VERSION, {
      field: CharacterPatchField.Name,
      value: CharacterName.parse('Kyra II'),
    });
    const stale = service.patch(created.id, FIRST_VERSION, {
      field: CharacterPatchField.Level,
      value: CharacterLevel.parse(3),
    });
    expect(await rejection(stale)).toBeInstanceOf(VersionConflictError);
  });

  test('unknown ancestry is rejected', async () => {
    const unknown = AncestryId.parse(newId());
    const created = service.create({ name: CharacterName.parse('X'), ancestry: unknown });
    expect(await rejection(created)).toBeInstanceOf(ValidationError);
  });

  test('missing character is not found', async () => {
    const missing = CharacterId.parse(newId());
    expect(await rejection(service.get(missing))).toBeInstanceOf(NotFoundError);
  });
});
