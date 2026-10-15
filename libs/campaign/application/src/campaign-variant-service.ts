import { CampaignVariantRuleId } from '@pioneer/campaign/domain';
import type {
  Campaign,
  CampaignId,
  CampaignVariantRules,
  EnabledVariantRuleId,
  EnableVariantRuleBody,
  VariantRuleOption,
} from '@pioneer/campaign/domain';
import { ForbiddenError, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayManageVariantRules, mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { CampaignVariantRepository } from './campaign-variant-repository';
import type { VariantRuleCatalog } from './variant-rule-catalog';

/** The ports `CampaignVariantService` works through. */
export interface CampaignVariantPorts {
  readonly campaigns: CampaignRepository;
  readonly variants: CampaignVariantRepository;
  readonly catalog: VariantRuleCatalog;
}

function byName(left: VariantRuleOption, right: VariantRuleOption): number {
  return left.name.localeCompare(right.name) || left.variantId.localeCompare(right.variantId);
}

/**
 * The variant rules a campaign uses. Every member reads the list; only the GM changes it, and only for a variant rule
 * that a pack the campaign uses defines. A variant rule whose pack the campaign no longer uses is left out of the list
 * and comes back with its pack (ADR-0061). Framework-free, like `CampaignPackService`.
 */
export class CampaignVariantService {
  readonly #campaigns: CampaignRepository;
  readonly #variants: CampaignVariantRepository;
  readonly #catalog: VariantRuleCatalog;
  readonly #clock: Clock;

  public constructor({ campaigns, variants, catalog }: CampaignVariantPorts, clock: Clock) {
    this.#campaigns = campaigns;
    this.#variants = variants;
    this.#catalog = catalog;
    this.#clock = clock;
  }

  /** The campaign's variant rules, and for its GM the ones they could enable. Not a member: 404. */
  public async variantRules(actor: UserId, id: CampaignId): Promise<CampaignVariantRules> {
    const campaign = await this.#viewed(actor, id);
    return this.#view(actor, campaign);
  }

  /**
   * The GM enables a variant rule. One no pack the campaign uses defines is a 404, and a player is refused with a 403.
   * Enabling it twice is no change.
   */
  public async enable(
    actor: UserId,
    id: CampaignId,
    { variantId }: EnableVariantRuleBody,
  ): Promise<CampaignVariantRules> {
    const campaign = await this.#managed(actor, id);
    const offered = await this.#catalog.of(id);
    if (!offered.some((option) => option.variantId === variantId)) {
      throw new NotFoundError('VariantRule', variantId);
    }
    await this.#variants.enable(actor, id, {
      id: CampaignVariantRuleId.parse(newId()),
      variantId,
      enabledBy: actor,
      enabledAt: this.#clock.now(),
    });
    return this.#view(actor, campaign);
  }

  /** The GM stops the campaign using a variant rule; one it does not use is no change. */
  public async disable(actor: UserId, id: CampaignId, variantId: EnabledVariantRuleId): Promise<CampaignVariantRules> {
    const campaign = await this.#managed(actor, id);
    await this.#variants.disable(actor, id, variantId);
    return this.#view(actor, campaign);
  }

  /** One of the actor's campaigns. One they are not in is a 404, the same as a missing one (ADR-0007). */
  async #viewed(actor: UserId, id: CampaignId): Promise<Campaign> {
    const campaign = await this.#campaigns.findById(id);
    if (campaign === undefined || !mayViewCampaign(actor, campaign)) {
      throw new NotFoundError('Campaign', id);
    }
    return campaign;
  }

  /** A campaign the actor runs. One they only play in is a 403. */
  async #managed(actor: UserId, id: CampaignId): Promise<Campaign> {
    const campaign = await this.#viewed(actor, id);
    if (!mayManageVariantRules(actor, campaign)) {
      throw new ForbiddenError(`Only the GM changes the variant rules of campaign ${id}`);
    }
    return campaign;
  }

  /** The variant rules in force and, for the GM, the ones they could enable. */
  async #view(actor: UserId, campaign: Campaign): Promise<CampaignVariantRules> {
    const manageable = mayManageVariantRules(actor, campaign);
    const [rows, offered] = await Promise.all([
      this.#variants.listForCampaign(campaign.id),
      this.#catalog.of(campaign.id),
    ]);
    const chosen = new Set(rows.map((row) => row.variantId));
    return {
      manageable,
      enabled: offered.filter((option) => chosen.has(option.variantId)).toSorted(byName),
      available: manageable ? offered.filter((option) => !chosen.has(option.variantId)).toSorted(byName) : [],
    };
  }
}
