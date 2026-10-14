import { beforeEach, describe, expect, test } from 'bun:test';

import type { HomebrewPack } from '@pioneer/homebrew/domain';
import { HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { BundleFile, ContentPackId, contentPackId, PackId, PackVisibility } from '@pioneer/rules/sdk';
import type { BundleBody, HomebrewManifestRequest } from '@pioneer/rules/sdk';
import { newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { HomebrewBundleService } from './homebrew-bundle-service';
import { InMemoryHomebrewPackRepository } from './in-memory-homebrew-pack-repository';
import { InMemoryPackBundleSource } from './in-memory-pack-bundle-source';
import { InMemoryPackDirectory } from './in-memory-pack-directory';
import { InMemoryPackEnablementDirectory } from './in-memory-pack-enablement-directory';
import { PackAccessPolicy } from './pack-access-policy';

const owner = UserId.parse(newId());
const member = UserId.parse(newId());
const stranger = UserId.parse(newId());

function request(...packs: readonly HomebrewPack[]): HomebrewManifestRequest {
  return { packs: packs.map((pack) => pack.id) };
}

describe('HomebrewBundleService', () => {
  let service: HomebrewBundleService;
  let privatePack: HomebrewPack;
  let campaignPack: HomebrewPack;
  let publicPack: HomebrewPack;

  beforeEach(async () => {
    privatePack = new HomebrewPackBuilder().slug('mine').ownedBy(owner).visibleTo(PackVisibility.Private).build();
    campaignPack = new HomebrewPackBuilder().slug('table').ownedBy(owner).visibleTo(PackVisibility.Campaign).build();
    publicPack = new HomebrewPackBuilder().slug('everyone').ownedBy(owner).visibleTo(PackVisibility.Public).build();
    const packs = new InMemoryHomebrewPackRepository();
    await Promise.all([privatePack, campaignPack, publicPack].map(async (pack) => packs.insert(pack)));
    service = new HomebrewBundleService({
      directory: new InMemoryPackDirectory(packs),
      access: new PackAccessPolicy(
        new InMemoryPackEnablementDirectory().enable(campaignPack.id, 'The Table', [member]),
      ),
      bundles: new InMemoryPackBundleSource([privatePack, campaignPack, publicPack]),
    });
  });

  /** The slugs the manifest lists for `user` asking for `packs`. */
  async function listed(user: UserId, ...packs: readonly HomebrewPack[]): Promise<readonly string[]> {
    const manifest = await service.manifest(user, request(...packs));
    return manifest.packs.map((pack) => String(pack.id));
  }

  /** The file of a pack's own bundle, as its owner's manifest names it. */
  async function bundleFileOf(pack: HomebrewPack): Promise<BundleFile> {
    const manifest = await service.manifest(owner, request(pack));
    const named = manifest.packs.find((each) => each.id === pack.slug);
    return BundleFile.parse(named?.file);
  }

  test('lists every pack the owner asks for, whatever its visibility', async () => {
    expect(await listed(owner, privatePack, campaignPack, publicPack)).toStrictEqual(['mine', 'table', 'everyone']);
  });

  test('lists a campaign pack for a member of a campaign that enables it, and a public one for anyone', async () => {
    expect(await listed(member, privatePack, campaignPack, publicPack)).toStrictEqual(['table', 'everyone']);
    expect(await listed(stranger, privatePack, campaignPack, publicPack)).toStrictEqual(['everyone']);
  });

  test('leaves out an official pack and one that does not exist, saying nothing about them', async () => {
    const official = contentPackId(PackId.parse('player-core'));

    const manifest = await service.manifest(owner, { packs: [official, ContentPackId.parse(newId())] });

    expect(manifest.packs).toStrictEqual([]);
  });

  test('serves a bundle of a pack the actor may read', async () => {
    const file = await bundleFileOf(campaignPack);

    const body: BundleBody = await service.bundle(member, campaignPack.slug, file);

    expect(body).toMatchObject({ id: 'table' });
  });

  test('refuses a stranger a campaign pack as a missing bundle', async () => {
    const file = await bundleFileOf(campaignPack);

    const refusal = await rejection(service.bundle(stranger, campaignPack.slug, file));

    expect(refusal).toBeInstanceOf(NotFoundError);
  });

  test('refuses a member a private pack as a missing bundle', async () => {
    const file = await bundleFileOf(privatePack);

    const refusal = await rejection(service.bundle(member, privatePack.slug, file));

    expect(refusal).toBeInstanceOf(NotFoundError);
  });

  test('refuses a file no current manifest names', async () => {
    const file = await bundleFileOf(publicPack);
    const stale = BundleFile.parse(file.replace(/[\da-f]{16}/u, 'f'.repeat(16)));

    const refusal = await rejection(service.bundle(owner, publicPack.slug, stale));

    expect(refusal).toBeInstanceOf(NotFoundError);
  });
});
