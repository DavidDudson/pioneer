import { beforeEach, describe, expect, test } from 'bun:test';

import { contentPackId, ContentPackId, ContentText, PackId, PackVisibility } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { HomebrewMessage } from './homebrew-message';
import { HomebrewPackService } from './homebrew-pack-service';
import { InMemoryAuthorDirectory } from './in-memory-author-directory';
import { InMemoryHomebrewPackRepository } from './in-memory-homebrew-pack-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const feats = { title: ContentText.parse('Amiri feats'), slug: PackId.parse('amiri-feats') };

describe('HomebrewPackService', () => {
  let service: HomebrewPackService;

  beforeEach(() => {
    service = new HomebrewPackService(
      {
        packs: new InMemoryHomebrewPackRepository(),
        authors: new InMemoryAuthorDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren'),
      },
      fixedClock('2026-10-10T10:00:00Z'),
    );
  });

  test('create makes an empty private pack owned by the actor, credited to their name', async () => {
    const created = await service.create(amiri, feats);
    expect(created.id).toBe(contentPackId(feats.slug));
    expect(created.ownerId).toBe(amiri);
    expect(created.publisher).toBe('Amiri');
    expect(created.visibility).toBe(PackVisibility.Private);
    expect(created.entryCount).toBe(0);
    expect(await service.get(amiri, created.id)).toStrictEqual(created);
  });

  test('a slug already in use is a conflict', async () => {
    await service.create(amiri, feats);
    const error = await rejection(service.create(ezren, feats));
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).descriptor).toStrictEqual({ key: HomebrewMessage.SlugTaken });
  });

  test('list returns only the actor’s packs', async () => {
    const first = await service.create(amiri, feats);
    await service.create(ezren, { title: ContentText.parse('Ezren spells'), slug: PackId.parse('ezren-spells') });
    const mine = await service.list(amiri);
    expect(mine.map(({ id }) => id)).toStrictEqual([first.id]);
  });

  test('another user’s pack is not found, the same as a missing one', async () => {
    const created = await service.create(amiri, feats);
    const hidden = await rejection(service.get(ezren, created.id));
    const unknown = ContentPackId.parse(newId());
    const missing = await rejection(service.get(ezren, unknown));
    expect(hidden).toBeInstanceOf(NotFoundError);
    expect((hidden as NotFoundError).descriptor).toStrictEqual((missing as NotFoundError).descriptor);
  });

  test('a user without an account cannot create', async () => {
    const stranger = UserId.parse(newId());
    expect(await rejection(service.create(stranger, feats))).toBeInstanceOf(NotFoundError);
  });
});
