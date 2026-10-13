import { beforeEach, describe, expect, spyOn, test } from 'bun:test';

import { NO_ENTRIES } from '@pioneer/homebrew/domain';
import { contentPackId, ContentPackId, ContentText, PackId, PackVisibility } from '@pioneer/rules/sdk';
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
const seoni = UserId.parse(newId());
const feats = {
  title: ContentText.parse('Amiri feats'),
  slug: PackId.parse('amiri-feats'),
};

async function visibilityOf(service: HomebrewPackService, actor: UserId, id: ContentPackId): Promise<PackVisibility> {
  const pack = await service.get(actor, id);
  return pack.visibility;
}

describe('HomebrewPackService', () => {
  let service: HomebrewPackService;
  let enablement: InMemoryPackEnablementDirectory;
  let dependencies: InMemoryPackDependencyRepository;
  let directory: InMemoryPackDirectory;
  let packs: InMemoryHomebrewPackRepository;

  beforeEach(() => {
    enablement = new InMemoryPackEnablementDirectory();
    dependencies = new InMemoryPackDependencyRepository();
    packs = new InMemoryHomebrewPackRepository();
    directory = new InMemoryPackDirectory(packs);
    service = new HomebrewPackService(
      {
        packs,
        authors: new InMemoryAuthorDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren'),
        enablement,
        directory,
        dependencies,
      },
      fixedClock('2026-10-10T10:00:00Z'),
    );
  });

  test('create makes an empty private pack owned by the actor, credited to their name', async () => {
    const created = await service.create(amiri, feats);
    expect(created.id).toBe(contentPackId(feats.slug));
    expect(created.ownerId).toBe(amiri);
    expect(created.publisher).toBe(ContentText.parse('Amiri'));
    expect(created.visibility).toBe(PackVisibility.Private);
    expect(created.entryCount).toBe(NO_ENTRIES);
    expect(await service.get(amiri, created.id)).toStrictEqual(created);
  });

  test('a slug already in use is a conflict', async () => {
    await service.create(amiri, feats);
    const error = await rejection(service.create(ezren, feats));
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).descriptor).toStrictEqual({
      key: HomebrewMessage.SlugTaken,
    });
  });

  test('list returns only the actor’s packs', async () => {
    const first = await service.create(amiri, feats);
    await service.create(ezren, {
      title: ContentText.parse('Ezren spells'),
      slug: PackId.parse('ezren-spells'),
    });
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

  describe('setVisibility', () => {
    test('the owner shares a pack with a campaign, then everyone, then takes it back', async () => {
      const created = await service.create(amiri, feats);
      const campaign = await service.setVisibility(amiri, created.id, PackVisibility.Campaign);
      const everyone = await service.setVisibility(amiri, created.id, PackVisibility.Public);
      const back = await service.setVisibility(amiri, created.id, PackVisibility.Private);
      expect([campaign, everyone, back].map(({ visibility }) => visibility)).toStrictEqual([
        PackVisibility.Campaign,
        PackVisibility.Public,
        PackVisibility.Private,
      ]);
      expect(await service.get(amiri, created.id)).toStrictEqual(back);
    });

    test('a public pack can be read by anyone but only changed by its owner', async () => {
      const created = await service.create(amiri, feats);
      await service.setVisibility(amiri, created.id, PackVisibility.Public);
      expect(await visibilityOf(service, ezren, created.id)).toBe(PackVisibility.Public);
      const refusal = await rejection(service.setVisibility(ezren, created.id, PackVisibility.Private));
      expect(refusal).toBeInstanceOf(ForbiddenError);
    });

    test('a campaign pack is readable by members of campaigns that enable it, who still cannot change it', async () => {
      const created = await service.create(amiri, feats);
      enablement.enable(created.id, 'Kingmaker', [ezren]);
      await service.setVisibility(amiri, created.id, PackVisibility.Campaign);
      expect(await visibilityOf(service, ezren, created.id)).toBe(PackVisibility.Campaign);
      expect(await rejection(service.get(seoni, created.id))).toBeInstanceOf(NotFoundError);
      const refusal = await rejection(service.setVisibility(ezren, created.id, PackVisibility.Public));
      expect(refusal).toBeInstanceOf(ForbiddenError);
    });

    test('someone who cannot read the pack is told it does not exist, never that it is forbidden', async () => {
      const created = await service.create(amiri, feats);
      const unknown = ContentPackId.parse(newId());
      const hidden = await rejection(service.setVisibility(ezren, created.id, PackVisibility.Public));
      const missing = await rejection(service.setVisibility(ezren, unknown, PackVisibility.Public));
      expect(hidden).toBeInstanceOf(NotFoundError);
      expect((hidden as NotFoundError).descriptor).toStrictEqual((missing as NotFoundError).descriptor);
      expect(await visibilityOf(service, amiri, created.id)).toBe(PackVisibility.Private);
    });

    test('making a pack private while campaigns enable it is refused, naming them', async () => {
      const created = await service.create(amiri, feats);
      await service.setVisibility(amiri, created.id, PackVisibility.Campaign);
      enablement.enable(created.id, 'Rise of the Runelords', [ezren]).enable(created.id, 'Kingmaker', [seoni]);
      const error = await rejection(service.setVisibility(amiri, created.id, PackVisibility.Private));
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).descriptor).toStrictEqual({
        key: HomebrewMessage.CampaignsEnableIt,
        params: { campaigns: 'Kingmaker, Rise of the Runelords' },
      });
      expect(await visibilityOf(service, amiri, created.id)).toBe(PackVisibility.Campaign);
    });

    test('widening a pack that campaigns enable is never refused', async () => {
      const created = await service.create(amiri, feats);
      await service.setVisibility(amiri, created.id, PackVisibility.Public);
      enablement.enable(created.id, 'Kingmaker', [ezren]);
      const widened = await service.setVisibility(amiri, created.id, PackVisibility.Campaign);
      expect(widened.visibility).toBe(PackVisibility.Campaign);
    });

    test('a pack the repository then finds gone is a 404', async () => {
      const vanishingPacks = new InMemoryHomebrewPackRepository();
      spyOn(vanishingPacks, 'updateVisibility').mockResolvedValue(undefined);
      const vanishing = new HomebrewPackService(
        {
          packs: vanishingPacks,
          authors: new InMemoryAuthorDirectory().name(amiri, 'Amiri'),
          enablement,
          directory: new InMemoryPackDirectory(vanishingPacks),
          dependencies,
        },
        fixedClock('2026-10-10T10:00:00Z'),
      );
      const created = await vanishing.create(amiri, feats);
      const error = await rejection(vanishing.setVisibility(amiri, created.id, PackVisibility.Public));
      expect(error).toBeInstanceOf(NotFoundError);
    });

    test('widening a pack past one it extends is refused, naming that pack', async () => {
      const base = await service.create(ezren, {
        title: ContentText.parse('Ezren base'),
        slug: PackId.parse('ezren-base'),
      });
      await service.setVisibility(ezren, base.id, PackVisibility.Campaign);
      const created = await service.create(amiri, feats);
      await dependencies.add(amiri, { pack: created.id, dependsOn: base.id }, async () => {});
      const error = await rejection(service.setVisibility(amiri, created.id, PackVisibility.Public));
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).descriptor).toStrictEqual({
        key: HomebrewMessage.WiderThanDependencies,
        params: { packs: 'Ezren base' },
      });
      expect(await visibilityOf(service, amiri, created.id)).toBe(PackVisibility.Private);
    });

    test('widening a pack as far as the ones it extends is allowed', async () => {
      directory.official({
        id: contentPackId(PackId.parse('player-core')),
        slug: PackId.parse('player-core'),
        title: ContentText.parse('Player Core'),
        publisher: ContentText.parse('Paizo'),
      });
      const created = await service.create(amiri, feats);
      await dependencies.add(
        amiri,
        {
          pack: created.id,
          dependsOn: contentPackId(PackId.parse('player-core')),
        },
        async () => {},
      );
      const widened = await service.setVisibility(amiri, created.id, PackVisibility.Public);
      expect(widened.visibility).toBe(PackVisibility.Public);
    });

    test('narrowing a pack under one that extends it is refused, counting those packs', async () => {
      const base = await service.create(amiri, feats);
      await service.setVisibility(amiri, base.id, PackVisibility.Public);
      const extension = await service.create(ezren, {
        title: ContentText.parse('Ezren more'),
        slug: PackId.parse('ezren-more'),
      });
      await service.setVisibility(ezren, extension.id, PackVisibility.Public);
      await dependencies.add(amiri, { pack: extension.id, dependsOn: base.id }, async () => {});
      const error = await rejection(service.setVisibility(amiri, base.id, PackVisibility.Campaign));
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).descriptor).toStrictEqual({
        key: HomebrewMessage.NarrowerThanDependents,
        params: { count: 1 },
      });
    });

    test('setting the visibility it already has changes nothing', async () => {
      const created = await service.create(amiri, feats);
      enablement.enable(created.id, 'Kingmaker', [ezren]);
      expect(await service.setVisibility(amiri, created.id, PackVisibility.Private)).toStrictEqual(created);
    });
  });
});
