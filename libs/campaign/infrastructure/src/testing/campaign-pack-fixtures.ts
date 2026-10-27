import {
  CampaignPackService,
  CampaignItemApprovalService,
  CampaignItemTransferService,
  CampaignKeyItemService,
  CampaignRuleLimitService,
  CampaignVariantService,
  InMemoryCampaignPackRepository,
  InMemoryCampaignItemApprovalRepository,
  InMemoryCampaignKeyItemRepository,
  InMemoryCampaignPartyRepository,
  InMemoryCharacterDirectory,
  InMemoryItemTransferRepository,
  InMemoryKeyItemHolders,
  InMemoryTransferLines,
  InMemoryCampaignRuleLimitRepository,
  InMemoryFlaggedItems,
  InMemoryCampaignVariantLimits,
  InMemoryCampaignVariantRepository,
  InMemoryPackCatalog,
  InMemoryVariantRuleCatalog,
} from '@pioneer/campaign/application';
import type {
  CampaignPartyRepository,
  CampaignRepository,
  CharacterDirectory,
  TransferLines,
} from '@pioneer/campaign/application';
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

/** The rule-breaking items service over in-memory ports; nothing is flagged until a test flags it. */
export function itemApprovalService(
  campaigns: CampaignRepository,
  clock: Clock,
  flagged: InMemoryFlaggedItems = new InMemoryFlaggedItems(),
): CampaignItemApprovalService {
  return new CampaignItemApprovalService(
    { campaigns, approvals: new InMemoryCampaignItemApprovalRepository(), flagged },
    clock,
  );
}

/** The party and characters a key items service reads, which a test shares with the party service. */
export interface KeyItemWorld {
  readonly party?: CampaignPartyRepository;
  readonly characters?: CharacterDirectory;
}

/** What an item transfer test can bring of its own. */
export interface ItemTransferWorld extends KeyItemWorld {
  readonly lines?: TransferLines;
}

/** The key items service over in-memory ports; no character is in the party until a test attaches one. */
export function keyItemService(
  campaigns: CampaignRepository,
  clock: Clock,
  {
    party = new InMemoryCampaignPartyRepository(campaigns),
    characters = new InMemoryCharacterDirectory(),
  }: KeyItemWorld = {},
): CampaignKeyItemService {
  return new CampaignKeyItemService(
    {
      campaigns,
      keyItems: new InMemoryCampaignKeyItemRepository(),
      party,
      characters,
      holders: new InMemoryKeyItemHolders(),
      flagged: new InMemoryFlaggedItems(),
    },
    clock,
  );
}

/** The item transfer service over in-memory ports; no character is in the party and none has a line until a test says. */
export function itemTransferService(
  campaigns: CampaignRepository,
  clock: Clock,
  {
    party = new InMemoryCampaignPartyRepository(campaigns),
    characters = new InMemoryCharacterDirectory(),
    lines = new InMemoryTransferLines(),
  }: ItemTransferWorld = {},
): CampaignItemTransferService {
  return new CampaignItemTransferService(
    { campaigns, transfers: new InMemoryItemTransferRepository(), party, characters, lines },
    clock,
  );
}
