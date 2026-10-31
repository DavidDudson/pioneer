import { beforeEach, describe, expect, test } from 'bun:test';

import { ContentPackId, contentPackId, ContentText, PackId, PackVisibility } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, ForbiddenError, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { HomebrewMessage } from './homebrew-message';
import { HomebrewPackService } from './homebrew-pack-service';
import { InMemoryAuthorDirectory } from './in-memory-author-directory';
import { InMemoryDependencyUsageDirectory } from './in-memory-dependency-usage-directory';
import { InMemoryHomebrewPackRepository } from './in-memory-homebrew-pack-repository';
import { InMemoryPackDependencyRepository } from './in-memory-pack-dependency-repository';
import { InMemoryPackDirectory } from './in-memory-pack-directory';
import { InMemoryPackEnablementDirectory } from './in-memory-pack-enablement-directory';
import { PackDependencyService } from './pack-dependency-service';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const seoni = UserId.parse(newId());
const PLAYER_CORE = PackId.parse('player-core');
const playerCore = contentPackId(PLAYER_CORE);

/** Titles of a pack's dependencies or candidates, for short assertions. */
function titles(packs: readonly { readonly title: ContentText }[]): readonly string[] {
  return packs.map((pack) => pack.title);
}

describe('PackDependencyService', () => {
  let packs: HomebrewPackService;
  let service: PackDependencyService;
  let usage: InMemoryDependencyUsageDirectory;
  let enablement: InMemoryPackEnablementDirectory;

  async function create(owner: UserId, slug: string, visibility: PackVisibility): Promise<ContentPackId> {
    const created = await packs.create(owner, {
      title: ContentText.parse(slug),
      slug: PackId.parse(slug),
    });
    await packs.setVisibility(owner, created.id, visibility);
    return created.id;
  }

  beforeEach(() => {
    const repository = new InMemoryHomebrewPackRepository();
    const directory = new InMemoryPackDirectory(repository).official({
      id: playerCore,
      slug: PLAYER_CORE,
      title: ContentText.parse('Player Core'),
      publisher: ContentText.parse('Paizo'),
    });
    const dependencies = new InMemoryPackDependencyRepository();
    enablement = new InMemoryPackEnablementDirectory();
    usage = new InMemoryDependencyUsageDirectory();
    const authors = new InMemoryAuthorDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren').name(seoni, 'Seoni');
    packs = new HomebrewPackService(
      { packs: repository, authors, enablement, directory, dependencies },
      fixedClock('2026-10-10T10:00:00Z'),
    );
    service = new PackDependencyService({
      packs: repository,
      directory,
      dependencies,
      usage,
      enablement,
    });
  });

  describe('add', () => {
    test('extends an official pack, and lists it', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Private);
      const result = await service.add(amiri, mine, { dependsOn: playerCore });
      expect(titles(result.dependencies)).toStrictEqual(['Player Core']);
      expect(result.dependencies[0]?.official).toBe(true);
      expect(await service.list(amiri, mine)).toStrictEqual(result);
    });

    test('extending the same pack twice is no change', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Private);
      const first = await service.add(amiri, mine, { dependsOn: playerCore });
      expect(await service.add(amiri, mine, { dependsOn: playerCore })).toStrictEqual(first);
    });

    test('a pack cannot extend itself', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Private);
      const error = await rejection(service.add(amiri, mine, { dependsOn: mine }));
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).descriptor).toStrictEqual({
        key: HomebrewMessage.DependsOnItself,
      });
    });

    test('a cycle is refused, naming the pack that would close it', async () => {
      const first = await create(amiri, 'first', PackVisibility.Private);
      const second = await create(amiri, 'second', PackVisibility.Private);
      const third = await create(amiri, 'third', PackVisibility.Private);
      await service.add(amiri, first, { dependsOn: second });
      await service.add(amiri, second, { dependsOn: third });
      const error = await rejection(service.add(amiri, third, { dependsOn: first }));
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).descriptor).toStrictEqual({
        key: HomebrewMessage.DependencyCycle,
        params: { dependency: 'first' },
      });
    });

    test('a pack wider than what it extends is refused', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Public);
      const base = await create(amiri, 'amiri-base', PackVisibility.Campaign);
      const error = await rejection(service.add(amiri, mine, { dependsOn: base }));
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).descriptor).toStrictEqual({
        key: HomebrewMessage.DependencyNarrower,
        params: { dependency: 'amiri-base' },
      });
    });

    test('a pack as narrow as what it extends is allowed', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Campaign);
      const base = await create(amiri, 'amiri-base', PackVisibility.Campaign);
      const result = await service.add(amiri, mine, { dependsOn: base });
      expect(titles(result.dependencies)).toStrictEqual(['amiri-base']);
    });

    test('another user’s private pack is a 404, as it cannot be read', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Private);
      const theirs = await create(ezren, 'ezren-secret', PackVisibility.Private);
      expect(await rejection(service.add(amiri, mine, { dependsOn: theirs }))).toBeInstanceOf(NotFoundError);
    });

    test('a pack that does not exist is a 404', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Private);
      const missing = ContentPackId.parse(newId());
      expect(await rejection(service.add(amiri, mine, { dependsOn: missing }))).toBeInstanceOf(NotFoundError);
    });

    test('only the owner adds: a reader is refused with a 403, a stranger with a 404', async () => {
      const shared = await create(amiri, 'amiri-feats', PackVisibility.Public);
      expect(await rejection(service.add(ezren, shared, { dependsOn: playerCore }))).toBeInstanceOf(ForbiddenError);
      const hidden = await create(amiri, 'amiri-hidden', PackVisibility.Private);
      expect(await rejection(service.add(ezren, hidden, { dependsOn: playerCore }))).toBeInstanceOf(NotFoundError);
    });
  });

  describe('remove', () => {
    test('stops extending the pack, and again is harmless', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Private);
      await service.add(amiri, mine, { dependsOn: playerCore });
      const removed = await service.remove(amiri, mine, playerCore);
      expect(removed.dependencies).toHaveLength(0);
      expect(await service.remove(amiri, mine, playerCore)).toStrictEqual(removed);
    });

    test('entries that still reference it refuse it, naming them', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Private);
      await service.add(amiri, mine, { dependsOn: playerCore });
      usage.use(mine, playerCore, 'Whirling Strike').use(mine, playerCore, 'Axe Rush');
      const error = await rejection(service.remove(amiri, mine, playerCore));
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).descriptor).toStrictEqual({
        key: HomebrewMessage.DependencyInUse,
        params: { entries: 'Axe Rush, Whirling Strike' },
      });
      const stillThere = await service.list(amiri, mine);
      expect(titles(stillThere.dependencies)).toStrictEqual(['Player Core']);
    });

    test('only the owner removes', async () => {
      const shared = await create(amiri, 'amiri-feats', PackVisibility.Public);
      await service.add(amiri, shared, { dependsOn: playerCore });
      expect(await rejection(service.remove(ezren, shared, playerCore))).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('list', () => {
    test('offers the owner readable packs that can still be added, and nothing else', async () => {
      const mine = await create(amiri, 'amiri-feats', PackVisibility.Campaign);
      await create(amiri, 'amiri-private', PackVisibility.Private);
      await create(amiri, 'amiri-wide', PackVisibility.Public);
      await create(ezren, 'ezren-public', PackVisibility.Public);
      await create(ezren, 'ezren-private', PackVisibility.Private);
      const { candidates } = await service.list(amiri, mine);
      // Not itself, not a narrower pack (a campaign pack may not extend a private one), not another user's private one.
      expect(titles(candidates)).toStrictEqual(['amiri-wide', 'ezren-public', 'Player Core']);
    });

    test('leaves out packs that would close a cycle, and ones already added', async () => {
      const first = await create(amiri, 'first', PackVisibility.Private);
      const second = await create(amiri, 'second', PackVisibility.Private);
      await service.add(amiri, first, { dependsOn: second });
      const offeredToSecond = await service.list(amiri, second);
      const offeredToFirst = await service.list(amiri, first);
      expect(titles(offeredToSecond.candidates)).not.toContain('first');
      expect(titles(offeredToFirst.candidates)).not.toContain('second');
    });

    test('shows a reader the dependencies they may read, with no candidates', async () => {
      const shared = await create(amiri, 'amiri-feats', PackVisibility.Public);
      await service.add(amiri, shared, { dependsOn: playerCore });
      const seen = await service.list(ezren, shared);
      expect(titles(seen.dependencies)).toStrictEqual(['Player Core']);
      expect(seen.candidates).toHaveLength(0);
      expect(seen.editable).toBe(false);
      const owned = await service.list(amiri, shared);
      expect(owned.editable).toBe(true);
    });

    test('hides a dependency the reader may not read', async () => {
      const base = await create(amiri, 'amiri-base', PackVisibility.Campaign);
      const shared = await create(amiri, 'amiri-feats', PackVisibility.Campaign);
      await service.add(amiri, shared, { dependsOn: base });
      enablement.enable(shared, 'Kingmaker', [seoni]);
      const seen = await service.list(seoni, shared);
      expect(seen.dependencies).toHaveLength(0);
    });

    test('a pack the actor cannot read is a 404', async () => {
      const hidden = await create(amiri, 'amiri-hidden', PackVisibility.Private);
      expect(await rejection(service.list(ezren, hidden))).toBeInstanceOf(NotFoundError);
    });
  });
});
