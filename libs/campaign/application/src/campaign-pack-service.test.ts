import { beforeEach, describe, expect, test } from 'bun:test';

import { EnabledPackId, PackPublisher, PackTitle } from '@pioneer/campaign/domain';
import type { Campaign, CampaignPacks } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { ConflictError, fixedClock, ForbiddenError, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import type { PackEnablement } from './campaign-pack-repository';
import { CampaignPackService } from './campaign-pack-service';
import { InMemoryCampaignPackRepository } from './in-memory-campaign-pack-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryPackCatalog } from './in-memory-pack-catalog';
import type { KnownPack } from './in-memory-pack-catalog';
import { PackMessage } from './pack-message';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());

const core = EnabledPackId.parse(newId());
const spells = EnabledPackId.parse(newId());
const feats = EnabledPackId.parse(newId());
const secret = EnabledPackId.parse(newId());
const foreign = EnabledPackId.parse(newId());
const missing = EnabledPackId.parse(newId());
const added = EnabledPackId.parse(newId());

function known(id: EnabledPackId, title: string, rest: Partial<KnownPack> = {}): KnownPack {
  return { id, title: PackTitle.parse(title), publisher: PackPublisher.parse('Paizo'), ...rest };
}

/** A repository where the packs change after the service planned and before the checks under lock. */
class RacingPackRepository extends InMemoryCampaignPackRepository {
  readonly #race: () => void;

  public constructor(race: () => void) {
    super();
    this.#race = race;
  }

  public override async enable(
    actor: UserId,
    enablement: PackEnablement,
    whileLocked: () => Promise<void>,
  ): Promise<void> {
    this.#race();
    await super.enable(actor, enablement, whileLocked);
  }
}

/** The enabled packs' titles, in order, as plain strings. */
function enabledTitles(packs: CampaignPacks): readonly string[] {
  return packs.enabled.map((pack) => String(pack.title));
}

/** The candidates' titles, in order, as plain strings. */
function candidateTitles(packs: CampaignPacks): readonly string[] {
  return packs.candidates.map((pack) => String(pack.title));
}

describe('CampaignPackService', () => {
  let campaigns: InMemoryCampaignRepository;
  let catalog: InMemoryPackCatalog;
  let service: CampaignPackService;
  let vaults: Campaign;

  beforeEach(async () => {
    campaigns = new InMemoryCampaignRepository();
    // Amiri owns Spells and Feats, and Feats extends Spells; Secret is theirs and private; Foreign is Ezren's.
    catalog = new InMemoryPackCatalog()
      .pack(known(core, 'Player Core', { official: true }))
      .pack(known(spells, 'Spells', { readers: [amiri] }))
      .pack(known(feats, 'Feats', { readers: [amiri] }))
      .pack(known(secret, 'Secret', { readers: [amiri], private: true }))
      .pack(known(foreign, 'Foreign', { readers: [ezren] }))
      .extend(feats, spells);
    service = new CampaignPackService(
      { campaigns, packs: new InMemoryCampaignPackRepository(), catalog },
      fixedClock('2026-10-10T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());
  });

  describe('packs', () => {
    test('lists the official packs, always on, to a member', async () => {
      const packs = await service.packs(ezren, vaults.id);
      expect(enabledTitles(packs)).toEqual(['Player Core']);
      expect(packs.enabled[0]).toMatchObject({ official: true, removable: false, requiredBy: [] });
    });

    test('offers the GM the packs they may read and have not enabled, never official ones', async () => {
      const packs = await service.packs(amiri, vaults.id);
      expect(packs.manageable).toBe(true);
      expect(candidateTitles(packs)).toEqual(['Feats', 'Secret', 'Spells']);
      expect(packs.candidates.find((pack) => pack.packId === secret)?.private).toBe(true);
    });

    test('offers a player nothing to enable', async () => {
      const packs = await service.packs(ezren, vaults.id);
      expect(packs.manageable).toBe(false);
      expect(packs.candidates).toEqual([]);
    });

    test('treats a campaign the actor is not in as missing', async () => {
      expect(await rejection(service.packs(stranger, vaults.id))).toBeInstanceOf(NotFoundError);
    });
  });

  describe('enable', () => {
    test('lets the GM enable a pack they own, and everyone in the campaign sees it', async () => {
      await service.enable(amiri, vaults.id, { packId: spells });
      const packs = await service.packs(ezren, vaults.id);
      expect(enabledTitles(packs)).toEqual(['Player Core', 'Spells']);
      expect(packs.enabled[1]).toMatchObject({ official: false, removable: false });
    });

    test('takes the packs it extends with it, shown with what requires them', async () => {
      const packs = await service.enable(amiri, vaults.id, { packId: feats });
      expect(enabledTitles(packs)).toEqual(['Player Core', 'Feats', 'Spells']);
      expect(packs.enabled.find((pack) => pack.packId === spells)).toMatchObject({
        requiredBy: ['Feats'],
        removable: false,
      });
      expect(packs.enabled.find((pack) => pack.packId === feats)).toMatchObject({ requiredBy: [], removable: true });
      expect(candidateTitles(packs)).toEqual(['Secret']);
    });

    test('is no change the second time', async () => {
      const first = await service.enable(amiri, vaults.id, { packId: spells });
      const second = await service.enable(amiri, vaults.id, { packId: spells });
      expect(second).toEqual(first);
    });

    test('is no change for an official pack, which is always on', async () => {
      const before = await service.packs(amiri, vaults.id);
      expect(await service.enable(amiri, vaults.id, { packId: core })).toEqual(before);
    });

    test('is a 409 for a private pack, asking for it to be shared first', async () => {
      const refusal = await rejection(service.enable(amiri, vaults.id, { packId: secret }));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({ descriptor: { key: PackMessage.Private, params: { pack: 'Secret' } } });
    });

    test('is a 404 for a pack the GM may not read, or none', async () => {
      expect(await rejection(service.enable(amiri, vaults.id, { packId: foreign }))).toBeInstanceOf(NotFoundError);
      expect(await rejection(service.enable(amiri, vaults.id, { packId: missing }))).toBeInstanceOf(NotFoundError);
    });

    test('is a 409 when a pack it extends is one the GM may not read', async () => {
      catalog.extend(spells, foreign);
      const refusal = await rejection(service.enable(amiri, vaults.id, { packId: feats }));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({ descriptor: { key: PackMessage.DependencyUnreadable } });
    });

    test('is a 403 for a player', async () => {
      expect(await rejection(service.enable(ezren, vaults.id, { packId: spells }))).toBeInstanceOf(ForbiddenError);
    });

    test('is a 404 for someone outside the campaign', async () => {
      expect(await rejection(service.enable(stranger, vaults.id, { packId: spells }))).toBeInstanceOf(NotFoundError);
    });

    test('is a 409 when the packs changed while it ran', async () => {
      const racing = new CampaignPackService(
        {
          campaigns,
          packs: new RacingPackRepository(() => {
            catalog.pack(known(added, 'Added', { readers: [amiri] })).extend(spells, added);
          }),
          catalog,
        },
        fixedClock('2026-10-10T10:00:00Z'),
      );
      const refusal = await rejection(racing.enable(amiri, vaults.id, { packId: feats }));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({ descriptor: { key: PackMessage.Changed } });
    });
  });

  describe('disable', () => {
    test('lets the GM stop using a pack', async () => {
      await service.enable(amiri, vaults.id, { packId: spells });
      const packs = await service.disable(amiri, vaults.id, spells);
      expect(enabledTitles(packs)).toEqual(['Player Core']);
      expect(candidateTitles(packs)).toContain('Spells');
    });

    test('is no change for a pack the campaign does not use', async () => {
      const before = await service.packs(amiri, vaults.id);
      expect(await service.disable(amiri, vaults.id, spells)).toEqual(before);
    });

    test('is a 409 for an official pack', async () => {
      const refusal = await rejection(service.disable(amiri, vaults.id, core));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({ descriptor: { key: PackMessage.AlwaysOn } });
    });

    test('is a 409 while an enabled pack extends it, naming that pack', async () => {
      await service.enable(amiri, vaults.id, { packId: feats });
      const refusal = await rejection(service.disable(amiri, vaults.id, spells));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({
        descriptor: { key: PackMessage.RequiredBy, params: { packs: 'Feats' } },
      });
    });

    test('lets the GM stop using the pack that extends first, then the one it extended', async () => {
      await service.enable(amiri, vaults.id, { packId: feats });
      await service.disable(amiri, vaults.id, feats);
      const packs = await service.disable(amiri, vaults.id, spells);
      expect(enabledTitles(packs)).toEqual(['Player Core']);
    });

    test('is a 403 for a player', async () => {
      await service.enable(amiri, vaults.id, { packId: spells });
      expect(await rejection(service.disable(ezren, vaults.id, spells))).toBeInstanceOf(ForbiddenError);
    });

    test('is a 404 for someone outside the campaign', async () => {
      expect(await rejection(service.disable(stranger, vaults.id, spells))).toBeInstanceOf(NotFoundError);
    });
  });
});
