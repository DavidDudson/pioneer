import {
  CampaignPackService,
  CampaignRuleLimitService,
  CampaignVariantService,
  InMemoryCampaignPackRepository,
  InMemoryCampaignRuleLimitRepository,
  InMemoryCampaignVariantLimits,
  InMemoryCampaignVariantRepository,
  InMemoryPackCatalog,
  InMemoryVariantRuleCatalog,
} from '@pioneer/campaign/application';
import type { CampaignRepository } from '@pioneer/campaign/application';
import type { Clock } from '@pioneer/shared/kernel';

/** A pack service over in-memory ports, for route tests; `catalog` says which packs exist. */
export function packService(
  campaigns: CampaignRepository,
  clock: Clock,
  catalog: InMemoryPackCatalog = new InMemoryPackCatalog(),
): CampaignPackService {
  return new CampaignPackService({ campaigns, packs: new InMemoryCampaignPackRepository(), catalog }, clock);
}

/** A variant rule service over in-memory ports, for route tests; `catalog` says which variant rules each campaign can use. */
export function variantService(
  campaigns: CampaignRepository,
  clock: Clock,
  catalog: InMemoryVariantRuleCatalog = new InMemoryVariantRuleCatalog(),
): CampaignVariantService {
  return new CampaignVariantService({ campaigns, variants: new InMemoryCampaignVariantRepository(), catalog }, clock);
}

/** A table limit service over in-memory ports, for route tests. */
export function ruleLimitService(campaigns: CampaignRepository, clock: Clock): CampaignRuleLimitService {
  return new CampaignRuleLimitService(
    {
      campaigns,
      limits: new InMemoryCampaignRuleLimitRepository(),
      variantLimits: new InMemoryCampaignVariantLimits(),
    },
    clock,
  );
}
