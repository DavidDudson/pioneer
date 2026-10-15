import { beforeEach, describe, expect, test } from 'bun:test';

import { AttachedCampaignName, CharacterName, PackAuthority } from '@pioneer/character/domain';
import type { Character, CharacterVariantRules } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import {
  contentId,
  ContentLicense,
  ContentPack,
  ContentPackId,
  ContentRegistry,
  EntrySlug,
  PackId,
  VariantRuleId,
} from '@pioneer/rules/sdk';
import type { ContentSource } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { ConflictError, fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterContent } from './character-content';
import { CharacterService } from './character-service';
import { CharacterVariantMessage } from './character-variant-message';
import { CharacterVariantService } from './character-variant-service';
import { EffectivePacks } from './effective-packs';
import { InMemoryAttachedCampaignPacks } from './in-memory-attached-campaign-packs';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryCharacterVariantRepository } from './in-memory-character-variant-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const brew = ContentPackId.parse(newId());
const campaignName = AttachedCampaignName.parse('Tuesday Table');

const BOOK = { kind: 'book', book: 'gm-core', page: 1 } as const;

function variantPack(id: string, title: string, variants: readonly [slug: string, name: string][]): ContentPack {
  return ContentPack.define({
    manifest: { id, title, publisher: 'Pioneer', license: ContentLicense.Homebrew },
    ancestries: [],
    creatures: [],
    variantRules: variants.map(([slug, name]) => ({
      slug: `variant-rule:${slug}`,
      name,
      sources: [BOOK],
      rules: [],
    })),
  });
}

const official = variantPack('core-rules', 'Core Rules', [['without-level', 'Proficiency Without Level']]);
const homebrew = variantPack('table-rules', 'Table Rules', [['gritty', 'Gritty Healing']]);

function variantId(pack: string, slug: string): VariantRuleId {
  return VariantRuleId.parse(contentId(PackId.parse(pack), EntrySlug.parse(`variant-rule:${slug}`)));
}

const withoutLevel = variantId('core-rules', 'without-level');
const gritty = variantId('table-rules', 'gritty');
const unknown = variantId('table-rules', 'unknown');

/** The official variant pack, and the homebrew one while the character's packs include `brew`. */
function variantContent(): ContentSource {
  return {
    registry: async (packs = []): Promise<ContentRegistry> => {
      const registry = new ContentRegistry();
      registry.register(official);
      if (packs.includes(brew)) {
        registry.register(homebrew);
      }
      return registry;
    },
  };
}

/** The homebrew packs a character uses, which a test changes. */
class SwitchablePacks extends EffectivePacks {
  public packs: readonly ContentPackId[] = [brew];

  public override async of(): Promise<readonly ContentPackId[]> {
    return this.packs;
  }
}

function names(rules: CharacterVariantRules['enabled']): readonly string[] {
  return rules.map(({ name }) => String(name));
}

describe('CharacterVariantService', () => {
  let service: CharacterVariantService;
  let packs: SwitchablePacks;
  let campaigns: InMemoryAttachedCampaignPacks;
  let kyra: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-14T10:00:00Z');
    const repository = new InMemoryCharacterRepository();
    packs = new SwitchablePacks();
    campaigns = new InMemoryAttachedCampaignPacks();
    service = new CharacterVariantService(
      {
        characters: repository,
        variants: new InMemoryCharacterVariantRepository(),
        content: variantContent(),
        packs,
        campaigns,
      },
      clock,
    );
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    kyra = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
  });

  async function enabledNames(): Promise<readonly string[]> {
    const rules = await service.variantRules(amiri, kyra.id);
    return names(rules.enabled);
  }

  /** The ids of the variant rules the content resolves for Kyra, in id order. */
  async function resolvedIds(content: CharacterContent): Promise<readonly VariantRuleId[]> {
    const entries = await content.variantRules(kyra);
    return entries.map(({ id }) => id).toSorted();
  }

  describe('listing', () => {
    test('a new character has none enabled and can enable the variant rules of the packs it uses', async () => {
      const rules = await service.variantRules(amiri, kyra.id);
      expect(rules.decidedBy).toBe(PackAuthority.Character);
      expect(rules.manageable).toBe(true);
      expect(names(rules.enabled)).toStrictEqual([]);
      expect(names(rules.available)).toStrictEqual(['Gritty Healing', 'Proficiency Without Level']);
      expect(rules.available.map(({ packTitle }) => String(packTitle))).toStrictEqual(['Table Rules', 'Core Rules']);
    });

    test('another user gets the 404 of a missing character', async () => {
      expect(await rejection(service.variantRules(ezren, kyra.id))).toBeInstanceOf(NotFoundError);
    });
  });

  describe('enabling and disabling', () => {
    test('enables a variant rule of an official pack', async () => {
      const rules = await service.enable(amiri, kyra.id, { variantId: withoutLevel });
      expect(names(rules.enabled)).toStrictEqual(['Proficiency Without Level']);
      expect(names(rules.available)).toStrictEqual(['Gritty Healing']);
    });

    test('enabling it twice is no change', async () => {
      await service.enable(amiri, kyra.id, { variantId: withoutLevel });
      const rules = await service.enable(amiri, kyra.id, { variantId: withoutLevel });
      expect(names(rules.enabled)).toStrictEqual(['Proficiency Without Level']);
    });

    test('a variant rule no pack in force defines is a 404', async () => {
      expect(await rejection(service.enable(amiri, kyra.id, { variantId: unknown }))).toBeInstanceOf(NotFoundError);
      packs.packs = [];
      expect(await rejection(service.enable(amiri, kyra.id, { variantId: gritty }))).toBeInstanceOf(NotFoundError);
    });

    test('another user gets the 404 of a missing character, for either change', async () => {
      expect(await rejection(service.enable(ezren, kyra.id, { variantId: withoutLevel }))).toBeInstanceOf(
        NotFoundError,
      );
      expect(await rejection(service.disable(ezren, kyra.id, withoutLevel))).toBeInstanceOf(NotFoundError);
    });

    test('disables it, and disabling one that is not enabled is no change', async () => {
      await service.enable(amiri, kyra.id, { variantId: withoutLevel });
      const rules = await service.disable(amiri, kyra.id, withoutLevel);
      expect(names(rules.enabled)).toStrictEqual([]);
      const again = await service.disable(amiri, kyra.id, withoutLevel);
      expect(names(again.enabled)).toStrictEqual([]);
    });
  });

  describe('when its pack is switched off', () => {
    test('the variant rule is no longer in force, and comes back with its pack', async () => {
      await service.enable(amiri, kyra.id, { variantId: gritty });
      packs.packs = [];
      expect(await enabledNames()).toStrictEqual([]);
      expect(await service.of(kyra)).toStrictEqual([gritty]);
      packs.packs = [brew];
      expect(await enabledNames()).toStrictEqual(['Gritty Healing']);
    });

    test('the character content resolves only the variant rules its registry holds', async () => {
      await service.enable(amiri, kyra.id, { variantId: gritty });
      await service.enable(amiri, kyra.id, { variantId: withoutLevel });
      const content = new CharacterContent(variantContent(), packs, service);
      expect(await resolvedIds(content)).toStrictEqual([gritty, withoutLevel].toSorted());
    });
  });

  describe('in a campaign', () => {
    test('the campaign decides the set, whatever the character enabled', async () => {
      await service.enable(amiri, kyra.id, { variantId: withoutLevel });
      campaigns.attach(kyra.id, { name: campaignName, packs: [brew], variants: [gritty] });
      const rules = await service.variantRules(amiri, kyra.id);
      expect(rules.decidedBy).toBe(PackAuthority.Campaign);
      expect(rules.campaign).toBe(campaignName);
      expect(rules.manageable).toBe(false);
      expect(names(rules.enabled)).toStrictEqual(['Gritty Healing']);
      expect(rules.available).toStrictEqual([]);
      expect(await service.of(kyra)).toStrictEqual([gritty]);
    });

    test('detaching brings the character’s own set back', async () => {
      await service.enable(amiri, kyra.id, { variantId: withoutLevel });
      campaigns.attach(kyra.id, { name: campaignName, packs: [brew], variants: [] });
      campaigns.detach(kyra.id);
      const rules = await service.variantRules(amiri, kyra.id);
      expect(rules.decidedBy).toBe(PackAuthority.Character);
      expect(names(rules.enabled)).toStrictEqual(['Proficiency Without Level']);
    });

    test('refuses a change while it decides: a 409 naming it', async () => {
      campaigns.attach(kyra.id, { name: campaignName, packs: [], variants: [] });
      const refusal = await rejection(service.enable(amiri, kyra.id, { variantId: withoutLevel }));
      expect(refusal).toBeInstanceOf(ConflictError);
      expect(refusal).toMatchObject({
        descriptor: { key: CharacterVariantMessage.CampaignDecides, params: { campaign: campaignName } },
      });
      expect(await rejection(service.disable(amiri, kyra.id, withoutLevel))).toMatchObject({
        descriptor: { key: CharacterVariantMessage.CampaignDecides, params: { campaign: campaignName } },
      });
    });
  });
});
