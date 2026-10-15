import { beforeEach, describe, expect, test } from 'bun:test';

import {
  AttachedCampaignName,
  CharacterName,
  CharacterPatchField,
  itemContent,
  ItemQuantity,
} from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentKind, contentPackId, ContentRegistry, PackId } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentSource, VariantRuleId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { CharacterUnenabledService } from './character-unenabled-service';
import type { OwnChoices } from './character-unenabled-service';
import { InMemoryAttachedCampaignPacks } from './in-memory-attached-campaign-packs';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const BREW = PackId.parse('brew-pack');
const OTHER = PackId.parse('other-pack');
const brew = contentPackId(BREW);
const other = contentPackId(OTHER);
const campaignName = AttachedCampaignName.parse('Tuesday Table');

const brewPack = new ContentPackBuilder()
  .withId(BREW)
  .withVariantRule('gritty')
  .withItem(ContentKind.Equipment, 'lantern', { bulk: 'light' })
  .build();
const otherPack = new ContentPackBuilder().withId(OTHER).withVariantRule('slow').build();

/** A source whose registry holds the packs asked for, over a core pack. */
function source(): ContentSource {
  const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
  return {
    registry: async (packs = []): Promise<ContentRegistry> => {
      const registry = new ContentRegistry();
      registry.register(core);
      for (const pack of [brewPack, otherPack]) {
        if (packs.includes(contentPackId(pack.id))) {
          registry.register(pack);
        }
      }
      return registry;
    },
  };
}

class Own<Id> implements OwnChoices<Id> {
  public ids: readonly Id[] = [];

  public readonly own = async (): Promise<readonly Id[]> => this.ids;
}

describe('CharacterUnenabledService', () => {
  let service: CharacterUnenabledService;
  let packs: Own<ContentPackId>;
  let variants: Own<VariantRuleId>;
  let campaigns: InMemoryAttachedCampaignPacks;
  let kyra: Character;
  let grittyId: VariantRuleId;
  let slowId: VariantRuleId;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-16T10:00:00Z');
    const repository = new InMemoryCharacterRepository();
    packs = new Own<ContentPackId>();
    variants = new Own<VariantRuleId>();
    campaigns = new InMemoryAttachedCampaignPacks();
    const content = source();
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    service = new CharacterUnenabledService({ characters: repository, content, packs, variants, campaigns });
    const registry = await content.registry([brew, other]);
    const gritty = registry.variantRules().find((entry) => contentPackId(entry.pack.id) === brew);
    const slow = registry.variantRules().find((entry) => contentPackId(entry.pack.id) === other);
    if (gritty === undefined || slow === undefined) {
      throw new Error('Fixture variant rules missing');
    }
    grittyId = gritty.id;
    slowId = slow.id;
    const [lantern] = [...itemContent(registry).keys()];
    const service2 = new CharacterService(repository, fixedContent(core, brewPack), clock);
    kyra = await service2.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
    if (lantern !== undefined) {
      ({ character: kyra } = await service2.patch(amiri, kyra.id, {
        expectedVersion: kyra.version,
        patch: {
          field: CharacterPatchField.GiftItem,
          item: lantern,
          quantity: ItemQuantity.parse(1),
          container: undefined,
        },
      }));
    }
  });

  test('is empty while the character is in no campaign', async () => {
    packs.ids = [brew];
    variants.ids = [grittyId];
    expect(await service.unenabled(amiri, kyra.id)).toStrictEqual({ variantRules: [], packs: [], items: [] });
  });

  test('lists what the character uses and the campaign has not enabled, by name', async () => {
    packs.ids = [brew, other];
    variants.ids = [grittyId, slowId];
    campaigns.attach(kyra.id, { name: campaignName, packs: [other], variants: [slowId] });
    const unenabled = await service.unenabled(amiri, kyra.id);
    expect(unenabled.campaign).toBe(campaignName);
    expect(unenabled.variantRules.map(({ name }) => String(name))).toStrictEqual(['gritty']);
    expect(unenabled.packs.map(({ packId }) => packId)).toStrictEqual([brew]);
    expect(unenabled.items.map(({ name }) => String(name))).toStrictEqual(['Lantern']);
  });

  test('warns of nothing once the campaign enables it', async () => {
    packs.ids = [brew];
    variants.ids = [grittyId];
    campaigns.attach(kyra.id, { name: campaignName, packs: [brew], variants: [grittyId] });
    const unenabled = await service.unenabled(amiri, kyra.id);
    expect(unenabled).toStrictEqual({ campaign: campaignName, variantRules: [], packs: [], items: [] });
  });

  test('warns of nothing once the character stops using it', async () => {
    packs.ids = [];
    variants.ids = [];
    campaigns.attach(kyra.id, { name: campaignName, packs: [], variants: [] });
    const unenabled = await service.unenabled(amiri, kyra.id);
    expect(unenabled.variantRules).toStrictEqual([]);
    expect(unenabled.packs).toStrictEqual([]);
  });

  test('another user gets the 404 of a missing character', async () => {
    expect(await rejection(service.unenabled(ezren, kyra.id))).toBeInstanceOf(NotFoundError);
  });
});
