import { CampaignCharacterId } from '@pioneer/campaign/domain';
import type {
  AttachCharacterBody,
  Campaign,
  CampaignCharacter,
  CampaignId,
  CampaignParty,
  CharacterId,
  OwnedCharacter,
  PartyCharacter,
} from '@pioneer/campaign/domain';
import { ConflictError, ForbiddenError, message, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CampaignPartyRepository } from './campaign-party-repository';
import { mayAttachCharacter, mayDetachCharacter, mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { CharacterDirectory, CharacterSummary } from './character-directory';
import type { MemberDirectory } from './member-directory';
import { PartyMessage } from './party-message';

/** The ports `CampaignPartyService` works through. */
export interface CampaignPartyPorts {
  readonly campaigns: CampaignRepository;
  readonly party: CampaignPartyRepository;
  readonly characters: CharacterDirectory;
  readonly directory: MemberDirectory;
}

/** A character's summary as the picker lists it. */
function owned(character: CharacterSummary): OwnedCharacter {
  return { characterId: character.id, name: character.name, level: character.level };
}

/**
 * The characters players bring into a campaign. A member attaches a character they own, and its
 * owner or the GM detaches it; a character is in one campaign at most. Framework-free, like
 * `CampaignService`.
 */
export class CampaignPartyService {
  readonly #campaigns: CampaignRepository;
  readonly #party: CampaignPartyRepository;
  readonly #characters: CharacterDirectory;
  readonly #directory: MemberDirectory;
  readonly #clock: Clock;

  public constructor({ campaigns, party, characters, directory }: CampaignPartyPorts, clock: Clock) {
    this.#campaigns = campaigns;
    this.#party = party;
    this.#characters = characters;
    this.#directory = directory;
    this.#clock = clock;
  }

  /** The campaign's party and the actor's characters that could join it. Not a member: 404. */
  public async party(actor: UserId, id: CampaignId): Promise<CampaignParty> {
    const campaign = await this.#viewed(actor, id);
    return this.#partyOf(actor, campaign);
  }

  /**
   * The actor brings one of their characters into the campaign. Someone else's character, or one that
   * doesn't exist, is a 404; one already in another campaign is a 409, and in this one no change.
   */
  public async attach(actor: UserId, id: CampaignId, { characterId }: AttachCharacterBody): Promise<CampaignParty> {
    const campaign = await this.#viewed(actor, id);
    const attachment = await this.#attachment(actor, campaign, characterId);
    const placed = await this.#party.attach(id, attachment);
    if (placed === undefined) {
      // The actor was removed after the campaign loaded: it is no longer theirs to see.
      throw new NotFoundError('Campaign', id);
    }
    if (placed !== id) {
      throw new ConflictError(
        `Character ${characterId} is already in campaign ${placed}`,
        message(PartyMessage.InOtherCampaign),
      );
    }
    return this.#partyOf(actor, campaign);
  }

  /**
   * The character's owner or the GM takes it out of the campaign. One not in it is no change, so
   * detaching twice is harmless; another player's character is a 403, as the actor can see it.
   */
  public async detach(actor: UserId, id: CampaignId, characterId: CharacterId): Promise<CampaignParty> {
    const campaign = await this.#viewed(actor, id);
    const attachments = await this.#party.listForCampaign(id);
    const attachment = attachments.find((candidate) => candidate.characterId === characterId);
    const owner = attachment === undefined ? undefined : campaign.memberById(attachment.memberId);
    if (owner === undefined) {
      return this.#partyOf(actor, campaign);
    }
    if (!mayDetachCharacter(actor, campaign, owner.userId)) {
      throw new ForbiddenError(`Only its owner or the GM detaches character ${characterId} from campaign ${id}`);
    }
    await this.#party.detach(id, characterId);
    return this.#partyOf(actor, campaign);
  }

  /** A new attachment of the actor's character to the campaign. Someone else's, or a missing one: 404. */
  async #attachment(actor: UserId, campaign: Campaign, characterId: CharacterId): Promise<CampaignCharacter> {
    const characters = await this.#characters.byIds([characterId]);
    const character = characters.get(characterId);
    const member = campaign.members.find((candidate) => candidate.userId === actor);
    if (character === undefined || member === undefined || !mayAttachCharacter(actor, campaign, character.ownerId)) {
      throw new NotFoundError('Character', characterId);
    }
    return {
      id: CampaignCharacterId.parse(newId()),
      characterId,
      memberId: member.id,
      attachedAt: this.#clock.now(),
    };
  }

  /** One of the actor's campaigns. One they are not in is a 404, the same as a missing one (ADR-0007). */
  async #viewed(actor: UserId, id: CampaignId): Promise<Campaign> {
    const campaign = await this.#campaigns.findById(id);
    if (campaign === undefined || !mayViewCampaign(actor, campaign)) {
      throw new NotFoundError('Campaign', id);
    }
    return campaign;
  }

  /** The campaign's party and the actor's characters in no campaign, as the actor sees them. */
  async #partyOf(actor: UserId, campaign: Campaign): Promise<CampaignParty> {
    const [attachments, mine] = await Promise.all([
      this.#party.listForCampaign(campaign.id),
      this.#characters.ownedBy(actor),
    ]);
    const [summaries, placed, names] = await Promise.all([
      this.#characters.byIds(attachments.map((attachment) => attachment.characterId)),
      this.#party.campaignsOf(mine.map((character) => character.id)),
      this.#directory.displayNames(campaign.members.map((member) => member.userId)),
    ]);
    // A character goes with its member and its owner's account, so a gap is a change since the campaign loaded.
    const characters = attachments.flatMap((attachment): PartyCharacter[] => {
      const owner = campaign.memberById(attachment.memberId);
      const character = summaries.get(attachment.characterId);
      const ownerName = owner === undefined ? undefined : names.get(owner.userId);
      if (owner === undefined || character === undefined || ownerName === undefined) {
        return [];
      }
      return [
        {
          ...owned(character),
          ownerId: owner.userId,
          ownerName,
          attachedAt: attachment.attachedAt,
          detachable: mayDetachCharacter(actor, campaign, owner.userId),
        },
      ];
    });
    const attachable = mine.filter((character) => !placed.has(character.id)).map((character) => owned(character));
    return { characters, attachable };
  }
}
