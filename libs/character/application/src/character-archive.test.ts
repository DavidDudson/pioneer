import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CharacterName, CharacterSort } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, NotFoundError, SortDirection, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const kyra = CharacterName.parse('Kyra');
const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const byName = { sort: CharacterSort.Name, direction: SortDirection.Asc } as const;

describe('archiving a character (ADR-0062)', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;

  beforeEach(() => {
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, content, fixedClock('2026-10-15T08:00:00Z'));
  });

  test('an archived character leaves the list and reads as missing, and is on the archived list', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    await service.archive(amiri, created.id);
    expect(await service.list(amiri, byName)).toStrictEqual([]);
    expect(await rejection(service.get(amiri, created.id))).toBeInstanceOf(NotFoundError);
    const archived = await service.listArchived(amiri, byName);
    expect(archived.map((character) => character.id)).toStrictEqual([created.id]);
  });

  test('restoring brings it back unchanged', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    await service.archive(amiri, created.id);
    await service.restore(amiri, created.id);
    expect(await service.get(amiri, created.id)).toStrictEqual(created);
    expect(await service.listArchived(amiri, byName)).toStrictEqual([]);
  });

  test('archiving twice and restoring a live character are harmless', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    await service.restore(amiri, created.id);
    await service.archive(amiri, created.id);
    const again = await service.archive(amiri, created.id);
    expect(again.id).toBe(created.id);
  });

  test("someone else's character, live or archived, is a 404 to archive and restore", async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    expect(await rejection(service.archive(ezren, created.id))).toBeInstanceOf(NotFoundError);
    await service.archive(amiri, created.id);
    expect(await rejection(service.restore(ezren, created.id))).toBeInstanceOf(NotFoundError);
    expect(await service.listArchived(ezren, byName)).toStrictEqual([]);
  });

  test('archive and restore are audited by name', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    await service.archive(amiri, created.id);
    await service.restore(amiri, created.id);
    expect(repository.audits.slice(1)).toStrictEqual([
      { actor: amiri, command: CharacterCommand.ArchiveCharacter },
      { actor: amiri, command: CharacterCommand.RestoreCharacter },
    ]);
  });
});
