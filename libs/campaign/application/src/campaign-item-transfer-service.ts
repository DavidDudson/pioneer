import { ItemTransferId, TransferStatus } from '@pioneer/campaign/domain';
import type {
  Campaign,
  CampaignId,
  CoinTransfer,
  CoinTransferView,
  ItemTransfer,
  ItemTransferView,
  OfferCoinsBody,
  OfferedCoins,
  OfferItemBody,
} from '@pioneer/campaign/domain';
import { ConflictError, message, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CampaignPartyRepository } from './campaign-party-repository';
import { mayViewCampaign } from './campaign-policy';
import type { CampaignRepository } from './campaign-repository';
import type { CharacterDirectory } from './character-directory';
import { ItemTransferMessage } from './item-transfer-message';
import type { ItemTransferRepository } from './item-transfer-repository';
import type { OfferableLine, OfferablePurse, TransferLines } from './transfer-lines';

/** Whether the purse holds at least every coin offered, denomination by denomination. */
function covers(held: OfferedCoins, offered: OfferedCoins): boolean {
  return held.pp >= offered.pp && held.gp >= offered.gp && held.sp >= offered.sp && held.cp >= offered.cp;
}

/** The ports `CampaignItemTransferService` works through. */
export interface CampaignItemTransferPorts {
  readonly campaigns: CampaignRepository;
  readonly transfers: ItemTransferRepository;
  readonly party: CampaignPartyRepository;
  readonly characters: CharacterDirectory;
  readonly lines: TransferLines;
}

/**
 * Item transfers between a campaign's characters (ADR-0064): a member offers an inventory line of their own character
 * to another character of the campaign, and the line stays with the giver until the offer is accepted. Inventory is
 * build data, so offers work in every sync mode. Framework-free, like `CampaignKeyItemService`.
 */
export class CampaignItemTransferService {
  readonly #campaigns: CampaignRepository;
  readonly #transfers: ItemTransferRepository;
  readonly #party: CampaignPartyRepository;
  readonly #characters: CharacterDirectory;
  readonly #lines: TransferLines;
  readonly #clock: Clock;

  public constructor({ campaigns, transfers, party, characters, lines }: CampaignItemTransferPorts, clock: Clock) {
    this.#campaigns = campaigns;
    this.#transfers = transfers;
    this.#party = party;
    this.#characters = characters;
    this.#lines = lines;
    this.#clock = clock;
  }

  /**
   * A member offers a line of one of their campaign characters to another character of the campaign. Not a member, a
   * character outside the party, a giver the member does not own, or a line the giver has not: 404. A key item's line,
   * a line already on offer, or the giver as its own recipient: 409. The giver's version is stored with the offer.
   */
  public async offer(actor: UserId, id: CampaignId, body: OfferItemBody): Promise<ItemTransferView> {
    await this.#viewed(actor, id);
    await this.#inParty(id, body);
    await this.#owned(actor, body);
    const line = await this.#offerable(id, body);
    const transfer: ItemTransfer = {
      id: ItemTransferId.parse(newId()),
      ...body,
      giverVersion: line.version,
      status: TransferStatus.Pending,
      createdAt: this.#clock.now(),
    };
    await this.#transfers.insert(actor, id, transfer);
    return { id: transfer.id, from: body.from, to: body.to, item: body.item, status: transfer.status };
  }

  /**
   * A member offers coins of one of their campaign characters to another character of the campaign, exactly as given per
   * denomination, and they stay with the giver until the offer is accepted. Not a member, a character outside the party,
   * or a giver the member does not own: 404. The giver as its own recipient, or more coins than the giver holds of any
   * denomination: 409. Several offers may be pending at once; the purse is checked again when one is accepted.
   */
  public async offerCoins(actor: UserId, id: CampaignId, body: OfferCoinsBody): Promise<CoinTransferView> {
    await this.#viewed(actor, id);
    await this.#inParty(id, body);
    await this.#owned(actor, body);
    const purse = await this.#held(body);
    const transfer: CoinTransfer = {
      id: ItemTransferId.parse(newId()),
      ...body,
      giverVersion: purse.version,
      status: TransferStatus.Pending,
      createdAt: this.#clock.now(),
    };
    await this.#transfers.insertCoins(actor, id, transfer);
    return { id: transfer.id, from: body.from, to: body.to, coins: body.coins, status: transfer.status };
  }

  /** The giver's purse, when it holds every coin offered: a missing character is a 404, a short purse a 409. */
  async #held({ from, coins }: OfferCoinsBody): Promise<OfferablePurse> {
    const purse = await this.#lines.purse(from);
    if (purse === undefined) {
      throw new NotFoundError('Character', from);
    }
    if (!covers(purse.coins, coins)) {
      throw new ConflictError('The giver does not hold that many coins', message(ItemTransferMessage.NotEnoughCoins));
    }
    return purse;
  }

  /** The giver's line, when it can go on offer: a missing one is a 404, a key item's or one already offered a 409. */
  async #offerable(id: CampaignId, { from, item }: OfferItemBody): Promise<OfferableLine> {
    const line = await this.#lines.describe(from, item);
    if (line === undefined) {
      throw new NotFoundError('InventoryItem', item);
    }
    if (line.keyItem) {
      throw new ConflictError(`Inventory item ${item} is a key item`, message(ItemTransferMessage.KeyItemLine));
    }
    const pending = await this.#transfers.listPending(id);
    if (pending.some((each) => each.from === from && each.item === item)) {
      throw new ConflictError(
        `Inventory item ${item} is already on offer`,
        message(ItemTransferMessage.AlreadyOffered),
      );
    }
    return line;
  }

  /** Both characters are in the campaign's party; one that is not is a 404. The same character twice is a 409. */
  async #inParty(id: CampaignId, { from, to }: Pick<OfferItemBody, 'from' | 'to'>): Promise<void> {
    const party = await this.#party.listForCampaign(id);
    for (const character of [from, to]) {
      if (!party.some((each) => each.characterId === character)) {
        throw new NotFoundError('Character', character);
      }
    }
    if (from === to) {
      throw new ConflictError('A character cannot offer to itself', message(ItemTransferMessage.SameCharacter));
    }
  }

  /**
   * The giver is the actor's own live character; another user's is a 404, as for characters themselves (ADR-0007), and
   * so is an archived one (ADR-0062).
   */
  async #owned(actor: UserId, { from }: Pick<OfferItemBody, 'from'>): Promise<void> {
    const named = await this.#characters.byIds([from]);
    const giver = named.get(from);
    if (giver === undefined || giver.ownerId !== actor || giver.archived) {
      throw new NotFoundError('Character', from);
    }
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
