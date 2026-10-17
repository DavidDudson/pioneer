import { KeyItemId, ReviewedName } from '@pioneer/campaign/domain';
import type {
  Campaign,
  CampaignId,
  CampaignKeyItem,
  CampaignKeyItems,
  CharacterId,
  CreateKeyItemBody,
  GiveKeyItemBody,
  KeyItemView,
} from '@pioneer/campaign/domain';
import { ForbiddenError, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CampaignKeyItemRepository } from './campaign-key-item-repository';
import type { CampaignPartyRepository } from './campaign-party-repository';
import { mayManageKeyItems, mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { CharacterDirectory } from './character-directory';
import type { KeyItemHolders } from './key-item-holders';

/** A key item of a campaign, as a route names it. */
export interface KeyItemRef {
  readonly id: CampaignId;
  readonly keyItemId: KeyItemId;
}

/** The ports `CampaignKeyItemService` works through. */
export interface CampaignKeyItemPorts {
  readonly campaigns: CampaignRepository;
  readonly keyItems: CampaignKeyItemRepository;
  readonly party: CampaignPartyRepository;
  readonly characters: CharacterDirectory;
  readonly holders: KeyItemHolders;
}

/**
 * The key items of a campaign (ADR-0064): named, story-significant items the GM gives to characters. A key item is
 * campaign data; its holder's inventory line only links back to it, so the GM giving, moving or taking one back writes
 * that line through `KeyItemHolders`. Every member reads them, the GM alone changes them, and a key item is archived,
 * never deleted. Framework-free, like `CampaignItemApprovalService`.
 */
export class CampaignKeyItemService {
  readonly #campaigns: CampaignRepository;
  readonly #keyItems: CampaignKeyItemRepository;
  readonly #party: CampaignPartyRepository;
  readonly #characters: CharacterDirectory;
  readonly #holders: KeyItemHolders;
  readonly #clock: Clock;

  public constructor({ campaigns, keyItems, party, characters, holders }: CampaignKeyItemPorts, clock: Clock) {
    this.#campaigns = campaigns;
    this.#keyItems = keyItems;
    this.#party = party;
    this.#characters = characters;
    this.#holders = holders;
    this.#clock = clock;
  }

  /** The campaign's key items and who holds them. Not a member: 404. */
  public async list(actor: UserId, id: CampaignId): Promise<CampaignKeyItems> {
    return this.#view(actor, await this.#viewed(actor, id));
  }

  /** The GM creates a key item, held by the party stash. A player is refused with a 403. */
  public async create(actor: UserId, id: CampaignId, body: CreateKeyItemBody): Promise<CampaignKeyItems> {
    const campaign = await this.#managed(actor, id);
    await this.#keyItems.insert(actor, id, {
      id: KeyItemId.parse(newId()),
      ...body,
      holder: undefined,
      createdAt: this.#clock.now(),
    });
    return this.#view(actor, campaign);
  }

  /**
   * The GM gives the key item to a character in the party, or moves it from the one holding it. A key item the
   * campaign has not, or a character outside the party, is a 404. The old holder's line goes before the new one's
   * arrives, so a failed move can be tried again.
   */
  public async give(actor: UserId, ref: KeyItemRef, body: GiveKeyItemBody): Promise<CampaignKeyItems> {
    const { id, keyItemId: keyItem } = ref;
    const campaign = await this.#managed(actor, id);
    const found = await this.#found(id, keyItem);
    const party = await this.#party.listForCampaign(id);
    if (!party.some((each) => each.characterId === body.characterId)) {
      throw new NotFoundError('Character', body.characterId);
    }
    if (found.holder !== body.characterId) {
      await this.#release(actor, found);
      await this.#holders.give(actor, body.characterId, found);
      await this.#keyItems.setHolder(actor, id, { id: keyItem, holder: body.characterId });
    }
    return this.#view(actor, campaign);
  }

  /** The GM takes the key item back to the party stash; one already there is no change. */
  public async takeBack(actor: UserId, ref: KeyItemRef): Promise<CampaignKeyItems> {
    const { id, keyItemId: keyItem } = ref;
    const campaign = await this.#managed(actor, id);
    const found = await this.#found(id, keyItem);
    await this.#release(actor, found);
    await this.#keyItems.setHolder(actor, id, { id: keyItem, holder: undefined });
    return this.#view(actor, campaign);
  }

  /** The GM archives the key item, which takes the holder's line with it; one already archived is no change. */
  public async archive(actor: UserId, ref: KeyItemRef): Promise<CampaignKeyItems> {
    const { id, keyItemId: keyItem } = ref;
    const campaign = await this.#managed(actor, id);
    const items = await this.#keyItems.listForCampaign(id);
    const found = items.find((each) => each.id === keyItem);
    if (found !== undefined) {
      await this.#release(actor, found);
      await this.#keyItems.archive(actor, id, { id: keyItem, at: this.#clock.now() });
    }
    return this.#view(actor, campaign);
  }

  /** Takes the key item's line from its holder, when it has one. */
  async #release(actor: UserId, keyItem: CampaignKeyItem): Promise<void> {
    if (keyItem.holder !== undefined) {
      await this.#holders.takeBack(actor, keyItem.holder, keyItem);
    }
  }

  async #found(id: CampaignId, keyItem: KeyItemId): Promise<CampaignKeyItem> {
    const items = await this.#keyItems.listForCampaign(id);
    const found = items.find((each) => each.id === keyItem);
    if (found === undefined) {
      throw new NotFoundError('KeyItem', keyItem);
    }
    return found;
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
    if (!mayManageKeyItems(actor, campaign)) {
      throw new ForbiddenError(`Only the GM manages the key items of campaign ${id}`);
    }
    return campaign;
  }

  async #view(actor: UserId, campaign: Campaign): Promise<CampaignKeyItems> {
    const items = await this.#keyItems.listForCampaign(campaign.id);
    const holders = items.flatMap((each): CharacterId[] => (each.holder === undefined ? [] : [each.holder]));
    const named = await this.#characters.byIds(holders);
    const keyItems = items.map(({ id, name, base, runes, notes, holder }): KeyItemView => ({
      id,
      name,
      base,
      runes,
      notes,
      holder,
      holderName: holder === undefined ? undefined : ReviewedName.optional().parse(named.get(holder)?.name),
      holderOwned: holder !== undefined && named.get(holder)?.ownerId === actor,
    }));
    return { manageable: mayManageKeyItems(actor, campaign), keyItems };
  }
}
