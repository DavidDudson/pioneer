import {
  CampaignInviteService,
  CampaignPackService,
  CampaignPartyService,
  CampaignRuleLimitService,
  CampaignService,
  CampaignVariantService,
} from '@pioneer/campaign/application';
import {
  campaignRoutes,
  DrizzleCampaignInviteRepository,
  DrizzleCampaignPackRepository,
  DrizzleCampaignPartyRepository,
  DrizzleCampaignRepository,
  DrizzleCampaignRuleLimitRepository,
  DrizzleCampaignVariantRepository,
} from '@pioneer/campaign/infrastructure';
import { PackAccessPolicy } from '@pioneer/homebrew/application';
import { DrizzlePackDependencyRepository, DrizzlePackDirectory } from '@pioneer/homebrew/infrastructure';
import { ContentRepository, StoredContentSource } from '@pioneer/rules/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import { CampaignVariantLimitsOfContent } from './campaign-variant-limits';
import { CampaignVariantRuleCatalog } from './campaign-variant-rule-catalog';
import type { Database } from './database';
import { HomebrewPackCatalog } from './homebrew-pack-catalog';
import { OwnedCharacterDirectory } from './owned-character-directory';
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

/** The campaign context's part of the composition root: services and routes. */
export function campaigns(db: Database, clock: Clock, authenticator: RequestAuthenticator): ContractRouter['app'] {
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
  const access = new PackAccessPolicy(new CampaignPackEnablementDirectory(db));
  const catalog = new HomebrewPackCatalog(
    new DrizzlePackDirectory(db),
    new DrizzlePackDependencyRepository(db),
    access,
  );
  const packs = new CampaignPackService(
    { campaigns: repository, packs: new DrizzleCampaignPackRepository(db), catalog },
    clock,
  );
  const variants = variantService(db, repository, clock);
  const ruleLimits = ruleLimitService(db, repository, clock);
  return campaignRoutes({ campaigns: service, invites, party, packs, variants, ruleLimits }, authenticator);
}
