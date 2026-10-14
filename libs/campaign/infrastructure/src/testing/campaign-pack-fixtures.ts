import {
  CampaignPackService,
  InMemoryCampaignPackRepository,
  InMemoryPackCatalog,
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
