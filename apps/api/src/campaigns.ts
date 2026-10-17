import {
  CampaignInviteService,
  CampaignItemApprovalService,
  CampaignKeyItemService,
  CampaignPackService,
  CampaignPartyService,
  CampaignRuleLimitService,
  CampaignService,
  CampaignVariantService,
} from '@pioneer/campaign/application';
import {
  campaignRoutes,
  DrizzleCampaignInviteRepository,
  DrizzleCampaignItemApprovalRepository,
  DrizzleCampaignKeyItemRepository,
  DrizzleCampaignPackRepository,
  DrizzleCampaignPartyRepository,
  DrizzleCampaignRepository,
  DrizzleCampaignRuleLimitRepository,
  DrizzleCampaignVariantRepository,
} from '@pioneer/campaign/infrastructure';
import type {
  CharacterFlaggedItems,
  CharacterKeyItemPromotion,
  CharacterKeyItems,
} from '@pioneer/character/application';
import { PackAccessPolicy } from '@pioneer/homebrew/application';
import { DrizzlePackDependencyRepository, DrizzlePackDirectory } from '@pioneer/homebrew/infrastructure';
import { ContentRepository, StoredContentSource } from '@pioneer/rules/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import { CampaignVariantLimitsOfContent } from './campaign-variant-limits';
import { CampaignVariantRuleCatalog } from './campaign-variant-rule-catalog';
import { CharacterKeyItemHolders } from './character-key-item-holders';
import type { Database } from './database';
import { HomebrewPackCatalog } from './homebrew-pack-catalog';
import { OwnedCharacterDirectory } from './owned-character-directory';
import { PartyFlaggedItems } from './party-flagged-items';
import { UserMemberDirectory } from './user-member-directory';

/** The variant-rule service: enabled rules are checked against the stored content. */
function variantService(db: Database, repository: DrizzleCampaignRepository, clock: Clock): CampaignVariantService {
  const content = new StoredContentSource(new ContentRepository(db));
  return new CampaignVariantService(
    {
      campaigns: repository,
      variants: new DrizzleCampaignVariantRepository(db),
      catalog: new CampaignVariantRuleCatalog(db, content),
    },
    clock,
  );
}

/** The table-limit service: the variant rules a campaign has on are read from the stored content. */
function ruleLimitService(db: Database, repository: DrizzleCampaignRepository, clock: Clock): CampaignRuleLimitService {
  const content = new StoredContentSource(new ContentRepository(db));
  return new CampaignRuleLimitService(
    {
      campaigns: repository,
      limits: new DrizzleCampaignRuleLimitRepository(db),
      variantLimits: new CampaignVariantLimitsOfContent(db, content),
    },
    clock,
  );
}

/** What the campaign context is given by the character context and the identity context. */
export interface CampaignParts {
  readonly authenticator: RequestAuthenticator;
  readonly flaggedItems: CharacterFlaggedItems;
  readonly keyItems: CharacterKeyItems;
  readonly keyItemPromotion: CharacterKeyItemPromotion;
}

/** The pack service: a homebrew pack is enabled only where its access policy allows. */
function packService(db: Database, repository: DrizzleCampaignRepository, clock: Clock): CampaignPackService {
  const catalog = new HomebrewPackCatalog(
    new DrizzlePackDirectory(db),
    new DrizzlePackDependencyRepository(db),
    new PackAccessPolicy(new CampaignPackEnablementDirectory(db)),
  );
  return new CampaignPackService(
    { campaigns: repository, packs: new DrizzleCampaignPackRepository(db), catalog },
    clock,
  );
}

/** The rule-breaking items service: the party's items are read off the characters. */
function itemApprovalService(
  db: Database,
  repository: DrizzleCampaignRepository,
  { clock, flaggedItems }: { readonly clock: Clock; readonly flaggedItems: CharacterFlaggedItems },
): CampaignItemApprovalService {
  return new CampaignItemApprovalService(
    {
      campaigns: repository,
      approvals: new DrizzleCampaignItemApprovalRepository(db),
      flagged: new PartyFlaggedItems(db, flaggedItems),
    },
    clock,
  );
}

/** The key items service: giving one writes a line into the holder's inventory through the character context. */
function keyItemService(
  db: Database,
  repository: DrizzleCampaignRepository,
  { clock, parts }: { readonly clock: Clock; readonly parts: CampaignParts },
): CampaignKeyItemService {
  return new CampaignKeyItemService(
    {
      campaigns: repository,
      keyItems: new DrizzleCampaignKeyItemRepository(db),
      party: new DrizzleCampaignPartyRepository(db),
      characters: new OwnedCharacterDirectory(db),
      holders: new CharacterKeyItemHolders(parts.keyItems, parts.keyItemPromotion),
      flagged: new PartyFlaggedItems(db, parts.flaggedItems),
    },
    clock,
  );
}

/** The campaign context's part of the composition root: services and routes. */
export function campaigns(db: Database, clock: Clock, parts: CampaignParts): ContractRouter['app'] {
  const repository = new DrizzleCampaignRepository(db);
  const inviteRepository = new DrizzleCampaignInviteRepository(db);
  const directory = new UserMemberDirectory(db);
  const service = new CampaignService({ campaigns: repository, invites: inviteRepository, directory }, clock);
  const invites = new CampaignInviteService(repository, inviteRepository, clock);
  const party = new CampaignPartyService(
    {
      campaigns: repository,
      party: new DrizzleCampaignPartyRepository(db),
      characters: new OwnedCharacterDirectory(db),
      directory,
    },
    clock,
  );
  const packs = packService(db, repository, clock);
  const variants = variantService(db, repository, clock);
  const ruleLimits = ruleLimitService(db, repository, clock);
  const itemApprovals = itemApprovalService(db, repository, { clock, flaggedItems: parts.flaggedItems });
  const keyItems = keyItemService(db, repository, { clock, parts });
  return campaignRoutes(
    { campaigns: service, invites, party, packs, variants, ruleLimits, itemApprovals, keyItems },
    parts.authenticator,
  );
}
