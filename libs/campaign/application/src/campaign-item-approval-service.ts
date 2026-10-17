import { approves, CampaignItemApprovalId, ReviewedCount, sameLine } from '@pioneer/campaign/domain';
import type {
  ApprovedItem,
  ApproveItemBody,
  Campaign,
  CampaignId,
  CampaignItemReview,
  FlaggedItem,
} from '@pioneer/campaign/domain';
import { ForbiddenError, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CampaignItemApprovalRepository } from './campaign-item-approval-repository';
import { mayManageItemApprovals, mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { FlaggedItems } from './flagged-items';

/** The ports `CampaignItemApprovalService` works through. */
export interface CampaignItemApprovalPorts {
  readonly campaigns: CampaignRepository;
  readonly approvals: CampaignItemApprovalRepository;
  readonly flagged: FlaggedItems;
}

/**
 * The rule-breaking items of a campaign's party (ADR-0064). The GM approves a flagged item for the count it is flagged
 * at and takes the approval back; every member reads the approved ones, and the GM alone sees the ones that need
 * review. An approval covers the item up to the count approved, so a warning comes back when the item breaks the rule
 * by more. Framework-free, like `CampaignRuleLimitService`.
 */
export class CampaignItemApprovalService {
  readonly #campaigns: CampaignRepository;
  readonly #approvals: CampaignItemApprovalRepository;
  readonly #flagged: FlaggedItems;
  readonly #clock: Clock;

  public constructor({ campaigns, approvals, flagged }: CampaignItemApprovalPorts, clock: Clock) {
    this.#campaigns = campaigns;
    this.#approvals = approvals;
    this.#flagged = flagged;
    this.#clock = clock;
  }

  /** The campaign's flagged items. Not a member: 404. */
  public async itemReview(actor: UserId, id: CampaignId): Promise<CampaignItemReview> {
    return this.#view(actor, await this.#viewed(actor, id));
  }

  /**
   * The GM approves a flagged item for the count it is flagged at now. A player is refused with a 403; an item that
   * does not break that rule is a 404. Approving it again replaces the count.
   */
  public async approve(actor: UserId, id: CampaignId, target: ApproveItemBody): Promise<CampaignItemReview> {
    const campaign = await this.#managed(actor, id);
    const items = await this.#flagged.of(id);
    const flagged = items.find((each) => sameLine(each, target));
    if (flagged === undefined) {
      throw new NotFoundError('FlaggedItem', target.item);
    }
    await this.#approvals.approve(actor, id, {
      id: CampaignItemApprovalId.parse(newId()),
      character: flagged.character,
      item: flagged.item,
      rule: flagged.rule,
      rune: flagged.rune,
      value: ReviewedCount.parse(flagged.count),
      approvedBy: actor,
      approvedAt: this.#clock.now(),
    });
    return this.#view(actor, campaign);
  }

  /** The GM takes an approval back, so the item needs review again; one already revoked is no change. */
  public async revoke(actor: UserId, id: CampaignId, approval: CampaignItemApprovalId): Promise<CampaignItemReview> {
    const campaign = await this.#managed(actor, id);
    await this.#approvals.revoke(actor, id, { id: approval, at: this.#clock.now() });
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
    if (!mayManageItemApprovals(actor, campaign)) {
      throw new ForbiddenError(`Only the GM approves the rule-breaking items of campaign ${id}`);
    }
    return campaign;
  }

  async #view(actor: UserId, campaign: Campaign): Promise<CampaignItemReview> {
    const [flagged, approvals] = await Promise.all([
      this.#flagged.of(campaign.id),
      this.#approvals.listForCampaign(campaign.id),
    ]);
    const approvedItems: ApprovedItem[] = [];
    const open: FlaggedItem[] = [];
    for (const item of flagged) {
      const covering = approvals.find((approval) => approves(approval, item));
      if (covering === undefined) {
        open.push(item);
      } else {
        approvedItems.push({ ...item, approval: covering.id, approvedCount: covering.value });
      }
    }
    const manageable = mayManageItemApprovals(actor, campaign);
    return { manageable, needsReview: manageable ? open : [], approved: approvedItems };
  }
}
