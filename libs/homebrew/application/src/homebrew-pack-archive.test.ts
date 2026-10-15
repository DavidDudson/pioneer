import { beforeEach, describe, expect, test } from 'bun:test';

import { HomebrewCommand } from '@pioneer/homebrew/domain';
import { contentPackId, ContentText, PackId, PackVisibility } from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, ForbiddenError, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { HomebrewMessage } from './homebrew-message';
import { HomebrewPackService } from './homebrew-pack-service';
import { InMemoryAuthorDirectory } from './in-memory-author-directory';
import { InMemoryHomebrewPackRepository } from './in-memory-homebrew-pack-repository';
import { InMemoryPackDependencyRepository } from './in-memory-pack-dependency-repository';
import { InMemoryPackDirectory } from './in-memory-pack-directory';
import { InMemoryPackEnablementDirectory } from './in-memory-pack-enablement-directory';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const feats = { title: ContentText.parse('Amiri feats'), slug: PackId.parse('amiri-feats') };
const spells = { title: ContentText.parse('Amiri spells'), slug: PackId.parse('amiri-spells') };

describe('archiving a homebrew pack (ADR-0062)', () => {
  let service: HomebrewPackService;
  let packs: InMemoryHomebrewPackRepository;
  let directory: InMemoryPackDirectory;
  let dependencies: InMemoryPackDependencyRepository;

  /** `pack` extends `base`, as the dependency service would store it. */
  async function extend(pack: ContentPackId, base: ContentPackId): Promise<void> {
    await dependencies.add(amiri, { pack, dependsOn: base }, async () => {});
  }

  beforeEach(() => {
    packs = new InMemoryHomebrewPackRepository();
    directory = new InMemoryPackDirectory(packs);
    dependencies = new InMemoryPackDependencyRepository();
    service = new HomebrewPackService(
      {
        packs,
        authors: new InMemoryAuthorDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren'),
        enablement: new InMemoryPackEnablementDirectory(),
        directory,
        dependencies,
      },
      fixedClock('2026-10-15T08:00:00Z'),
    );
  });

  test('an archived pack leaves the list and the directory and reads as missing, and is on the archived list', async () => {
    const created = await service.create(amiri, feats);
    await service.archive(amiri, created.id);
    expect(await service.list(amiri)).toStrictEqual([]);
    expect(await directory.findById(created.id)).toBeUndefined();
    expect(await directory.all()).toStrictEqual([]);
    expect(await rejection(service.get(amiri, created.id))).toBeInstanceOf(NotFoundError);
    const archived = await service.listArchived(amiri);
    expect(archived.map((pack) => pack.id)).toStrictEqual([created.id]);
  });

  test('restoring brings it back unchanged', async () => {
    const created = await service.create(amiri, feats);
    await service.archive(amiri, created.id);
    await service.restore(amiri, created.id);
    expect(await service.get(amiri, created.id)).toStrictEqual(created);
    expect(await service.listArchived(amiri)).toStrictEqual([]);
  });

  test('archiving twice and restoring a live pack are harmless', async () => {
    const created = await service.create(amiri, feats);
    await service.restore(amiri, created.id);
    await service.archive(amiri, created.id);
    const again = await service.archive(amiri, created.id);
    expect(again.id).toBe(created.id);
  });

  test('an archived pack takes no visibility change', async () => {
    const created = await service.create(amiri, feats);
    await service.archive(amiri, created.id);
    const error = await rejection(service.setVisibility(amiri, created.id, PackVisibility.Public));
    expect(error).toBeInstanceOf(NotFoundError);
  });

  test('a reader who does not own the pack is refused, a stranger gets a 404, live or archived', async () => {
    const created = await service.create(amiri, feats);
    await service.setVisibility(amiri, created.id, PackVisibility.Public);
    expect(await rejection(service.archive(ezren, created.id))).toBeInstanceOf(ForbiddenError);
    expect(await rejection(service.restore(ezren, created.id))).toBeInstanceOf(ForbiddenError);
    await service.archive(amiri, created.id);
    expect(await rejection(service.archive(ezren, created.id))).toBeInstanceOf(NotFoundError);
    expect(await rejection(service.restore(ezren, created.id))).toBeInstanceOf(NotFoundError);
    expect(await service.listArchived(ezren)).toStrictEqual([]);
  });

  test('a pack that live packs extend can’t be archived until they are', async () => {
    const base = await service.create(amiri, spells);
    const extension = await service.create(amiri, feats);
    await extend(extension.id, base.id);
    const error = await rejection(service.archive(amiri, base.id));
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).descriptor).toStrictEqual({
      key: HomebrewMessage.ExtendedByPacks,
      params: { count: 1 },
    });
    const kept = await service.get(amiri, base.id);
    expect(kept.id).toBe(base.id);

    await service.archive(amiri, extension.id);
    await service.archive(amiri, base.id);
    expect(await service.listArchived(amiri)).toHaveLength(2);
  });

  test('a pack comes back only with the packs it extends', async () => {
    const base = await service.create(amiri, spells);
    const extension = await service.create(amiri, feats);
    await extend(extension.id, base.id);
    await service.archive(amiri, extension.id);
    await service.archive(amiri, base.id);
    const error = await rejection(service.restore(amiri, extension.id));
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).descriptor).toStrictEqual({
      key: HomebrewMessage.DependsOnArchived,
      params: { count: 1 },
    });

    await service.restore(amiri, base.id);
    await service.restore(amiri, extension.id);
    expect(await service.list(amiri)).toHaveLength(2);
  });

  test('a pack does not come back wider than a pack it extends, narrowed while it was archived', async () => {
    const base = await service.create(amiri, spells);
    const extension = await service.create(amiri, feats);
    await service.setVisibility(amiri, base.id, PackVisibility.Public);
    await service.setVisibility(amiri, extension.id, PackVisibility.Public);
    await extend(extension.id, base.id);
    await service.archive(amiri, extension.id);
    await service.setVisibility(amiri, base.id, PackVisibility.Private);
    const error = await rejection(service.restore(amiri, extension.id));
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).descriptor.key).toBe(HomebrewMessage.WiderThanDependencies);
    expect(await service.listArchived(amiri)).toHaveLength(1);
  });

  test('archive and restore are audited by name', async () => {
    const created = await service.create(amiri, feats);
    await service.archive(amiri, created.id);
    await service.restore(amiri, created.id);
    expect(packs.audits).toStrictEqual([
      { actor: amiri, command: HomebrewCommand.ArchivePack },
      { actor: amiri, command: HomebrewCommand.RestorePack },
    ]);
    expect(contentPackId(feats.slug)).toBe(created.id);
  });
});
