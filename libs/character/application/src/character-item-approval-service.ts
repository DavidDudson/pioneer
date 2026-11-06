import { ItemAcknowledgementId, ItemApproval } from '@pioneer/character/domain';
import type {
  AcknowledgeItemBody,
  Character,
  CharacterId,
  CharacterItemApprovals,
  ItemAcknowledgement,
} from '@pioneer/character/domain';
import { ConflictError, message, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { AttachedCampaignPacks } from './attached-campaign-packs';
import type { CharacterFlaggedItems } from './character-flagged-items';
import type { CharacterItemAcknowledgementRepository } from './character-item-acknowledgement-repository';
import { CharacterItemApprovalMessage } from './character-item-approval-message';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

/** The ports `CharacterItemApprovalService` works through. */
export interface CharacterItemApprovalPorts {
  readonly characters: CharacterRepository;
  readonly acknowledgements: CharacterItemAcknowledgementRepository;
  readonly campaigns: AttachedCampaignPacks;
  readonly flagged: CharacterFlaggedItems;
}

/**
 * What silences a character's rule-breaking warnings (ADR-0064). In a campaign its GM approves them, and the owner
 * reads the approvals. A character outside a campaign has no GM, so its owner acknowledges them the same way: for the
 * count the line breaks the rule by now, and the warning comes back if the line grows. Acknowledgements are kept when
 * the character joins a campaign but no longer count there, so only its GM silences a warning. Only the owner reads or
 * changes them. Framework-free, like `CharacterRuleLimitService`.
 */
export class CharacterItemApprovalService {
  readonly #characters: CharacterRepository;
  readonly #acknowledgements: CharacterItemAcknowledgementRepository;
  readonly #campaigns: AttachedCampaignPacks;
  readonly #flagged: CharacterFlaggedItems;
  readonly #clock: Clock;

  public constructor({ characters, acknowledgements, campaigns, flagged }: CharacterItemApprovalPorts, clock: Clock) {
    this.#characters = characters;
    this.#acknowledgements = acknowledgements;
    this.#campaigns = campaigns;
    this.#flagged = flagged;
    this.#clock = clock;
  }

  /**
   * The lines that stop warning: the campaign's approvals in a campaign, else the owner's acknowledgements. Not the
   * owner: 404.
   */
  public async itemApprovals(actor: UserId, id: CharacterId): Promise<CharacterItemApprovals> {
    await this.#owned(actor, id);
    return this.#view(id);
  }

  /**
   * The owner acknowledges a line that breaks a rule now, at the count it breaks it by. A character in a campaign
   * has a GM to approve instead: 409. A line that breaks no such rule is a 404. Acknowledging it again replaces the
   * count.
   */
  public async acknowledge(
    actor: UserId,
    id: CharacterId,
    target: AcknowledgeItemBody,
  ): Promise<CharacterItemApprovals> {
    const character = await this.#owned(actor, id);
    await this.#refuseIfCampaignApproves(id);
    const lines = await this.#flagged.of(character);
    const line = lines.find(
      (each) => each.item === target.item && each.rule === target.rule && each.rune === target.rune,
    );
    if (line === undefined) {
      throw new NotFoundError('FlaggedItem', target.item);
    }
    await this.#acknowledgements.acknowledge(actor, id, {
      id: ItemAcknowledgementId.parse(newId()),
      item: line.item,
      rule: line.rule,
      rune: line.rune,
      value: line.count,
      acknowledgedBy: actor,
      acknowledgedAt: this.#clock.now(),
    });
    return this.#view(id);
  }

  /** The owner takes an acknowledgement back so the warning returns; one already revoked is no change. */
  public async revoke(
    actor: UserId,
    id: CharacterId,
    acknowledgement: ItemAcknowledgementId,
  ): Promise<CharacterItemApprovals> {
    await this.#owned(actor, id);
    await this.#refuseIfCampaignApproves(id);
    await this.#acknowledgements.revoke(actor, id, { id: acknowledgement, at: this.#clock.now() });
    return this.#view(id);
  }

  /** One of the actor's characters. Another user's is a 404, the same as a missing one (ADR-0007). */
  async #owned(actor: UserId, id: CharacterId): Promise<Character> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }

  async #refuseIfCampaignApproves(id: CharacterId): Promise<void> {
    const campaign = await this.#campaigns.of(id);
    if (campaign !== undefined) {
      throw new ConflictError(
        `Character ${id} has the GM of ${campaign.name} to approve its rule-breaking items`,
        message(CharacterItemApprovalMessage.CampaignApproves, { campaign: campaign.name }),
      );
    }
  }

  async #view(id: CharacterId): Promise<CharacterItemApprovals> {
    const campaign = await this.#campaigns.of(id);
    if (campaign !== undefined) {
      return { campaign: campaign.id, acknowledgeable: false, approvals: campaign.approvals ?? [] };
    }
    const rows = await this.#acknowledgements.listForCharacter(id);
    return {
      campaign: undefined,
      acknowledgeable: true,
      approvals: rows.map((row) => toApproval(row)),
    };
  }
}

function toApproval(row: ItemAcknowledgement): ItemApproval {
  return ItemApproval.parse({
    item: row.item,
    rule: row.rule,
    rune: row.rune,
    value: row.value,
    acknowledgement: row.id,
  });
}
