import { beforeEach, describe, expect, test } from 'bun:test';

import { EnabledVariantRuleId, PackTitle, VariantRuleName } from '@pioneer/campaign/domain';
import type { Campaign, CampaignVariantRules, VariantRuleOption } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { fixedClock, ForbiddenError, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignVariantService } from './campaign-variant-service';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryCampaignVariantRepository } from './in-memory-campaign-variant-repository';
import { InMemoryVariantRuleCatalog } from './in-memory-variant-rule-catalog';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());

function option(name: string, packTitle: string): VariantRuleOption {
  return {
    variantId: EnabledVariantRuleId.parse(newId()),
    name: VariantRuleName.parse(name),
    packTitle: PackTitle.parse(packTitle),
  };
}

const withoutLevel = option('Proficiency Without Level', 'Core Rules');
const gritty = option('Gritty Healing', 'Table Rules');
const absent = EnabledVariantRuleId.parse(newId());

function names(rules: CampaignVariantRules['enabled']): readonly string[] {
  return rules.map(({ name }) => String(name));
}

describe('CampaignVariantService', () => {
  let campaigns: InMemoryCampaignRepository;
  let catalog: InMemoryVariantRuleCatalog;
  let service: CampaignVariantService;
  let vaults: Campaign;

  beforeEach(async () => {
    campaigns = new InMemoryCampaignRepository();
    catalog = new InMemoryVariantRuleCatalog();
    service = new CampaignVariantService(
      { campaigns, variants: new InMemoryCampaignVariantRepository(), catalog },
      fixedClock('2026-10-14T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());
    catalog.offer(vaults.id, [withoutLevel, gritty]);
  });

  describe('listing', () => {
    test('offers the GM the variant rules of the packs in use, none enabled yet', async () => {
      const rules = await service.variantRules(amiri, vaults.id);
      expect(rules.manageable).toBe(true);
      expect(names(rules.enabled)).toStrictEqual([]);
      expect(names(rules.available)).toStrictEqual(['Gritty Healing', 'Proficiency Without Level']);
    });

    test('shows a player what is enabled, and offers them nothing', async () => {
      await service.enable(amiri, vaults.id, { variantId: gritty.variantId });
      const rules = await service.variantRules(ezren, vaults.id);
      expect(rules.manageable).toBe(false);
      expect(names(rules.enabled)).toStrictEqual(['Gritty Healing']);
      expect(rules.available).toStrictEqual([]);
    });

    test('a non-member gets the 404 of a missing campaign', async () => {
      expect(await rejection(service.variantRules(stranger, vaults.id))).toBeInstanceOf(NotFoundError);
    });
  });

  describe('enabling and disabling', () => {
    test('the GM enables a variant rule, once however often they ask', async () => {
      await service.enable(amiri, vaults.id, { variantId: withoutLevel.variantId });
      const rules = await service.enable(amiri, vaults.id, { variantId: withoutLevel.variantId });
      expect(names(rules.enabled)).toStrictEqual(['Proficiency Without Level']);
      expect(names(rules.available)).toStrictEqual(['Gritty Healing']);
    });

    test('a variant rule no pack in use defines is a 404', async () => {
      expect(await rejection(service.enable(amiri, vaults.id, { variantId: absent }))).toBeInstanceOf(NotFoundError);
    });

    test('a player is refused with a 403, for either change', async () => {
      expect(await rejection(service.enable(ezren, vaults.id, { variantId: gritty.variantId }))).toBeInstanceOf(
        ForbiddenError,
      );
      expect(await rejection(service.disable(ezren, vaults.id, gritty.variantId))).toBeInstanceOf(ForbiddenError);
    });

    test('a non-member gets a 404, for either change', async () => {
      expect(await rejection(service.enable(stranger, vaults.id, { variantId: gritty.variantId }))).toBeInstanceOf(
        NotFoundError,
      );
      expect(await rejection(service.disable(stranger, vaults.id, gritty.variantId))).toBeInstanceOf(NotFoundError);
    });

    test('the GM disables one, and disabling one that is not enabled is no change', async () => {
      await service.enable(amiri, vaults.id, { variantId: gritty.variantId });
      const rules = await service.disable(amiri, vaults.id, gritty.variantId);
      expect(names(rules.enabled)).toStrictEqual([]);
      const again = await service.disable(amiri, vaults.id, gritty.variantId);
      expect(names(again.enabled)).toStrictEqual([]);
    });
  });

  describe('when its pack stops being used', () => {
    test('the variant rule leaves the list, and comes back with its pack', async () => {
      await service.enable(amiri, vaults.id, { variantId: gritty.variantId });
      catalog.offer(vaults.id, [withoutLevel]);
      const without = await service.variantRules(amiri, vaults.id);
      expect(names(without.enabled)).toStrictEqual([]);
      catalog.offer(vaults.id, [withoutLevel, gritty]);
      const back = await service.variantRules(amiri, vaults.id);
      expect(names(back.enabled)).toStrictEqual(['Gritty Healing']);
    });
  });
});
