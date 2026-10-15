import { beforeEach, describe, expect, test } from 'bun:test';

import {
  AttachedCampaignName,
  CharacterName,
  PackAuthority,
  PackPublisher,
  PackTitle,
} from '@pioneer/character/domain';
import type { Character, CharacterPacks } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { ConflictError, fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterPackMessage } from './character-pack-message';
import { CharacterPackService } from './character-pack-service';
import { CharacterService } from './character-service';
import { InMemoryAttachedCampaignPacks } from './in-memory-attached-campaign-packs';
import { InMemoryCharacterPackCatalog } from './in-memory-character-pack-catalog';
import type { KnownPack } from './in-memory-character-pack-catalog';
import { InMemoryCharacterPackRepository } from './in-memory-character-pack-repository';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

const core = ContentPackId.parse(newId());
const spells = ContentPackId.parse(newId());
const feats = ContentPackId.parse(newId());
const secret = ContentPackId.parse(newId());
const foreign = ContentPackId.parse(newId());
const missing = ContentPackId.parse(newId());
const table = ContentPackId.parse(newId());

function known(id: ContentPackId, title: string, rest: Partial<KnownPack> = {}): KnownPack {
  return { id, title: PackTitle.parse(title), publisher: PackPublisher.parse('Paizo'), ...rest };
}

/** The enabled packs' titles, in order, as plain strings. */
function enabledTitles(packs: CharacterPacks): readonly string[] {
  return packs.enabled.map((pack) => String(pack.title));
}

/** The candidates' titles, in order, as plain strings. */
function candidateTitles(packs: CharacterPacks): readonly string[] {
  return packs.candidates.map((pack) => String(pack.title));
}

describe('CharacterPackService', () => {
  let service: CharacterPackService;
  let catalog: InMemoryCharacterPackCatalog;
  let campaigns: InMemoryAttachedCampaignPacks;
  let kyra: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-14T10:00:00Z');
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const repository = new InMemoryCharacterRepository();
    catalog = new InMemoryCharacterPackCatalog()
      .pack({ ...known(core, 'Player Core'), official: true })
      .pack({ ...known(spells, 'Spells'), readers: [amiri] })
      .pack({ ...known(feats, 'Feats'), readers: [amiri] })
      .pack({ ...known(secret, 'Secret'), readers: [amiri], private: true })
      .pack({ ...known(foreign, 'Foreign'), readers: [ezren] })
      .pack({ ...known(table, 'Table Rules'), readers: [amiri, ezren] })
      .extend(feats, spells)
      .extend(table, foreign);
    campaigns = new InMemoryAttachedCampaignPacks();
    service = new CharacterPackService(
      { characters: repository, packs: new InMemoryCharacterPackRepository(), catalog, campaigns },
      clock,
    );
    kyra = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
  });

  describe('listing', () => {
    test('a new character uses the official packs and can add the packs its owner reads', async () => {
      const packs = await service.packs(amiri, kyra.id);
      expect(packs.decidedBy).toBe(PackAuthority.Character);
      expect(packs.manageable).toBe(true);
      expect(enabledTitles(packs)).toStrictEqual(['Player Core']);
      expect(packs.enabled[0]?.removable).toBe(false);
      expect(candidateTitles(packs)).toStrictEqual(['Feats', 'Secret', 'Spells', 'Table Rules']);
    });

    test('another user gets the 404 of a missing character', async () => {
      expect(await rejection(service.packs(ezren, kyra.id))).toBeInstanceOf(NotFoundError);
    });
  });

  describe('enabling', () => {
    test('enables a pack the owner reads', async () => {
      const packs = await service.enable(amiri, kyra.id, { packId: spells });
      expect(enabledTitles(packs)).toStrictEqual(['Player Core', 'Spells']);
      expect(candidateTitles(packs)).toStrictEqual(['Feats', 'Secret', 'Table Rules']);
      expect(packs.enabled[1]?.removable).toBe(true);
    });

    test('enables the packs it extends too, and says which pack needs them', async () => {
      const packs = await service.enable(amiri, kyra.id, { packId: feats });
      expect(enabledTitles(packs)).toStrictEqual(['Player Core', 'Feats', 'Spells']);
      const dependency = packs.enabled.find((pack) => pack.packId === spells);
      expect(dependency?.requiredBy.map(String)).toStrictEqual(['Feats']);
      expect(dependency?.removable).toBe(false);
    });

    test('enabling a pack twice is no change', async () => {
      await service.enable(amiri, kyra.id, { packId: spells });
      const packs = await service.enable(amiri, kyra.id, { packId: spells });
      expect(enabledTitles(packs)).toStrictEqual(['Player Core', 'Spells']);
    });

    test('a private pack is fine: the owner tries their own packs before sharing them', async () => {
      const packs = await service.enable(amiri, kyra.id, { packId: secret });
      expect(enabledTitles(packs)).toStrictEqual(['Player Core', 'Secret']);
    });

    test('a pack the owner may not read is a 404, as is a missing one', async () => {
      expect(await rejection(service.enable(amiri, kyra.id, { packId: foreign }))).toBeInstanceOf(NotFoundError);
      expect(await rejection(service.enable(amiri, kyra.id, { packId: missing }))).toBeInstanceOf(NotFoundError);
    });

    test('a pack extending one the owner may not read is a 409', async () => {
      const refusal = await rejection(service.enable(amiri, kyra.id, { packId: table }));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({ descriptor: { key: CharacterPackMessage.DependencyUnreadable } });
    });

    test('only the owner enables a pack', async () => {
      expect(await rejection(service.enable(ezren, kyra.id, { packId: table }))).toBeInstanceOf(NotFoundError);
    });
  });

  describe('disabling', () => {
    test('disables a pack', async () => {
      await service.enable(amiri, kyra.id, { packId: spells });
      const packs = await service.disable(amiri, kyra.id, spells);
      expect(enabledTitles(packs)).toStrictEqual(['Player Core']);
      expect(candidateTitles(packs)).toContain('Spells');
    });

    test('disabling a pack the character does not use is no change', async () => {
      const packs = await service.disable(amiri, kyra.id, spells);
      expect(enabledTitles(packs)).toStrictEqual(['Player Core']);
    });

    test('a pack another enabled pack extends stays on, until that pack is disabled', async () => {
      await service.enable(amiri, kyra.id, { packId: feats });
      const refusal = await rejection(service.disable(amiri, kyra.id, spells));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({
        descriptor: { key: CharacterPackMessage.RequiredBy, params: { packs: 'Feats' } },
      });
      await service.disable(amiri, kyra.id, feats);
      const packs = await service.disable(amiri, kyra.id, spells);
      expect(enabledTitles(packs)).toStrictEqual(['Player Core']);
    });

    test('an official pack is always on: a 409', async () => {
      const refusal = await rejection(service.disable(amiri, kyra.id, core));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({ descriptor: { key: CharacterPackMessage.AlwaysOn } });
    });

    test('only the owner disables a pack', async () => {
      await service.enable(amiri, kyra.id, { packId: spells });
      expect(await rejection(service.disable(ezren, kyra.id, spells))).toBeInstanceOf(NotFoundError);
    });
  });

  describe('a pack the owner can no longer read', () => {
    test('is not in force, and is back when the owner reads it again', async () => {
      await service.enable(amiri, kyra.id, { packId: spells });
      catalog.pack(known(spells, 'Spells', { readers: [] }));
      expect(enabledTitles(await service.packs(amiri, kyra.id))).toStrictEqual(['Player Core']);
      catalog.pack(known(spells, 'Spells', { readers: [amiri] }));
      expect(enabledTitles(await service.packs(amiri, kyra.id))).toStrictEqual(['Player Core', 'Spells']);
    });
  });

  describe('a campaign', () => {
    const campaignName = AttachedCampaignName.parse('Abomination Vaults');

    test('decides the packs of a character attached to it, whatever the character enabled', async () => {
      await service.enable(amiri, kyra.id, { packId: spells });
      campaigns.attach(kyra.id, { name: campaignName, packs: [feats, spells], variants: [] });
      const packs = await service.packs(amiri, kyra.id);
      expect(packs.decidedBy).toBe(PackAuthority.Campaign);
      expect(packs.campaign).toBe(campaignName);
      expect(packs.manageable).toBe(false);
      expect(enabledTitles(packs)).toStrictEqual(['Player Core', 'Feats', 'Spells']);
      expect(packs.enabled.every((pack) => !pack.removable)).toBe(true);
      expect(packs.candidates).toStrictEqual([]);
    });

    test('attaching switches the effective set and detaching switches it back', async () => {
      await service.enable(amiri, kyra.id, { packId: spells });
      campaigns.attach(kyra.id, { name: campaignName, packs: [table, foreign], variants: [] });
      expect(enabledTitles(await service.packs(amiri, kyra.id))).toStrictEqual([
        'Player Core',
        'Foreign',
        'Table Rules',
      ]);
      campaigns.detach(kyra.id);
      const back = await service.packs(amiri, kyra.id);
      expect(back.decidedBy).toBe(PackAuthority.Character);
      expect(enabledTitles(back)).toStrictEqual(['Player Core', 'Spells']);
    });

    test('refuses a change while it decides: a 409 naming it', async () => {
      campaigns.attach(kyra.id, { name: campaignName, packs: [], variants: [] });
      const refusal = await rejection(service.enable(amiri, kyra.id, { packId: spells }));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({
        descriptor: { key: CharacterPackMessage.CampaignDecides, params: { campaign: campaignName } },
      });
      expect(await rejection(service.disable(amiri, kyra.id, spells))).toMatchObject({
        descriptor: { key: CharacterPackMessage.CampaignDecides, params: { campaign: campaignName } },
      });
    });
  });
});
