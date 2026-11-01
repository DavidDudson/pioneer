import type {
  Campaign,
  CampaignId,
  CharacterId,
  DepositBody,
  PartyStash,
  PartyStashContents,
  TakeBody,
} from '@pioneer/campaign/domain';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import type { CampaignPartyRepository } from './campaign-party-repository';
import { mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { CharacterDirectory } from './character-directory';
import type { PartyStashKeeper } from './party-stash-keeper';

/** The ports `CampaignPartyStashService` works through. */
export interface CampaignPartyStashPorts {
  readonly campaigns: CampaignRepository;
  readonly party: CampaignPartyRepository;
  readonly characters: CharacterDirectory;
  readonly stash: PartyStashKeeper;
}

/**
 * The party stash (ADR-0064): one flat container the campaign holds in common. Any member may put a line of their own
 * character into it and any member may take any line out into their own character; there is no lock and no per-line
 * owner. Held lines are in no character's inventory, so they add Bulk to no one. Framework-free.
 */
export class CampaignPartyStashService {
  readonly #campaigns: CampaignRepository;
  readonly #party: CampaignPartyRepository;
  readonly #characters: CharacterDirectory;
  readonly #stash: PartyStashKeeper;

  public constructor({ campaigns, party, characters, stash }: CampaignPartyStashPorts) {
    this.#campaigns = campaigns;
    this.#party = party;
    this.#characters = characters;
    this.#stash = stash;
  }

  /** What the party holds. Not a member: 404. */
  public async view(actor: UserId, id: CampaignId): Promise<PartyStash> {
    await this.#viewed(actor, id);
    const party = await this.#partyCharacters(id);
    return this.#seenBy(actor, await this.#stash.view(id, party), party);
  }

  /**
   * A member puts a line of one of their campaign characters, and what it holds, into the stash. Not a member, a
   * character outside the party or not theirs, or a line the character lacks: 404. A key item's line or a full stash: 409.
   */
  public async deposit(actor: UserId, id: CampaignId, { from, item }: DepositBody): Promise<PartyStash> {
    await this.#viewed(actor, id);
    const party = await this.#owned(actor, id, from);
    return this.#seenBy(actor, await this.#stash.deposit(actor, id, { character: from, item }), party);
  }

  /**
   * A member takes any line from the stash, and what it holds, into one of their campaign characters. Not a member, a
   * character outside the party or not theirs, or a line the stash lacks: 404. A character with no room: 409.
   */
  public async take(actor: UserId, id: CampaignId, { to, item }: TakeBody): Promise<PartyStash> {
    await this.#viewed(actor, id);
    const party = await this.#owned(actor, id, to);
    return this.#seenBy(actor, await this.#stash.take(actor, id, { character: to, item }), party);
  }

  /** The stash with the viewer's own live characters of the party, the ones that may put into it and take from it. */
  async #seenBy(actor: UserId, contents: PartyStashContents, party: readonly CharacterId[]): Promise<PartyStash> {
    const named = await this.#characters.byIds(party);
    const characters = party.flatMap((characterId) => {
      const found = named.get(characterId);
      return found === undefined || found.ownerId !== actor || found.archived
        ? []
        : [{ characterId, name: found.name }];
    });
    return { ...contents, characters };
  }

  async #partyCharacters(id: CampaignId): Promise<readonly CharacterId[]> {
    const party = await this.#party.listForCampaign(id);
    return party.map((each) => each.characterId);
  }

  /** The character is in the campaign's party and is the actor's own live one; anything else is a 404 (ADR-0007, ADR-0062). */
  async #owned(actor: UserId, id: CampaignId, character: CharacterId): Promise<readonly CharacterId[]> {
    const party = await this.#partyCharacters(id);
    const named = await this.#characters.byIds([character]);
    const found = named.get(character);
    if (!party.includes(character) || found === undefined || found.ownerId !== actor || found.archived) {
      throw new NotFoundError('Character', character);
    }
    return party;
  }

  /** One of the actor's campaigns. One they are not in is a 404, the same as a missing one (ADR-0007). */
  async #viewed(actor: UserId, id: CampaignId): Promise<Campaign> {
    const campaign = await this.#campaigns.findById(id);
    if (campaign === undefined || !mayViewCampaign(actor, campaign)) {
      throw new NotFoundError('Campaign', id);
    }
    return campaign;
  }
}
