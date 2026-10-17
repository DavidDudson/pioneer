import {
  CampaignRuleLimitId,
  CORE_LIMIT_DEFAULTS,
  LIMIT_CEILINGS,
  RuleLimitKey,
  RuleLimitSource,
} from '@pioneer/campaign/domain';
import type {
  Campaign,
  CampaignId,
  CampaignRuleLimits,
  RuleLimitChange,
  RuleLimitOverrides,
} from '@pioneer/campaign/domain';
import { ForbiddenError, message, newId, NotFoundError, ValidationError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayManageRuleLimits, mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { CampaignRuleLimitRepository } from './campaign-rule-limit-repository';
import type { CampaignVariantLimits } from './campaign-variant-limits';
import { RuleLimitMessage } from './rule-limit-message';

/** The ports `CampaignRuleLimitService` works through. */
export interface CampaignRuleLimitPorts {
  readonly campaigns: CampaignRepository;
  readonly limits: CampaignRuleLimitRepository;
  readonly variantLimits: CampaignVariantLimits;
}

/** Where `limit`'s number comes from: the GM's own beats a variant rule's, which beats the core rules' (ADR-0064). */
function sourceOf(
  limit: RuleLimitKey,
  set: ReadonlyMap<RuleLimitKey, unknown>,
  variant: RuleLimitOverrides,
): RuleLimitSource {
  if (set.has(limit)) {
    return RuleLimitSource.Campaign;
  }
  return variant[limit] === undefined ? RuleLimitSource.Core : RuleLimitSource.Variant;
}

/** The order the limits are listed in. */
const LIMIT_ORDER: readonly RuleLimitKey[] = Object.values(RuleLimitKey);

/**
 * The table limits of a campaign (ADR-0064). Every member reads them; only the GM sets or resets one. A limit with no
 * row is the number of the variant rules the campaign has on, else the core rules'. Framework-free, like
 * `CampaignVariantService`.
 */
export class CampaignRuleLimitService {
  readonly #campaigns: CampaignRepository;
  readonly #limits: CampaignRuleLimitRepository;
  readonly #variantLimits: CampaignVariantLimits;
  readonly #clock: Clock;

  public constructor({ campaigns, limits, variantLimits }: CampaignRuleLimitPorts, clock: Clock) {
    this.#campaigns = campaigns;
    this.#limits = limits;
    this.#variantLimits = variantLimits;
    this.#clock = clock;
  }

  /** The campaign's limits. Not a member: 404. */
  public async ruleLimits(actor: UserId, id: CampaignId): Promise<CampaignRuleLimits> {
    const campaign = await this.#viewed(actor, id);
    return this.#view(actor, campaign);
  }

  /**
   * The GM sets a limit. A number past the limit's ceiling is a 422 and a player is refused with a 403. Setting it
   * again replaces the number. Setting the core number stores it, so a later change to the core rules leaves the table
   * as the GM left it.
   */
  public async set(actor: UserId, id: CampaignId, { limit, value }: RuleLimitChange): Promise<CampaignRuleLimits> {
    const campaign = await this.#managed(actor, id);
    if (value > LIMIT_CEILINGS[limit]) {
      throw new ValidationError([
        { path: ['value'], message: message(RuleLimitMessage.Ceiling, { maximum: LIMIT_CEILINGS[limit] }) },
      ]);
    }
    await this.#limits.set(actor, id, {
      id: CampaignRuleLimitId.parse(newId()),
      limit,
      value,
      setBy: actor,
      setAt: this.#clock.now(),
    });
    return this.#view(actor, campaign);
  }

  /** The GM returns a limit to the core rules' number; one that was never set is no change. */
  public async reset(actor: UserId, id: CampaignId, limit: RuleLimitKey): Promise<CampaignRuleLimits> {
    const campaign = await this.#managed(actor, id);
    await this.#limits.reset(actor, id, limit);
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
    if (!mayManageRuleLimits(actor, campaign)) {
      throw new ForbiddenError(`Only the GM changes the table limits of campaign ${id}`);
    }
    return campaign;
  }

  async #view(actor: UserId, campaign: Campaign): Promise<CampaignRuleLimits> {
    const rows = await this.#limits.listForCampaign(campaign.id);
    const set = new Map(rows.map((row) => [row.limit, row.value]));
    const variant = await this.#variantLimits.of(campaign.id);
    return {
      manageable: mayManageRuleLimits(actor, campaign),
      limits: LIMIT_ORDER.map((limit) => ({
        limit,
        value: set.get(limit) ?? variant[limit] ?? CORE_LIMIT_DEFAULTS[limit],
        core: CORE_LIMIT_DEFAULTS[limit],
        ceiling: LIMIT_CEILINGS[limit],
        custom: set.has(limit),
        source: sourceOf(limit, set, variant),
      })),
    };
  }
}
