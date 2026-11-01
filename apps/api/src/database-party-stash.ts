import { PartyStashKeeper, PartyStashMessage } from '@pioneer/campaign/application';
import type { StashLineMove } from '@pioneer/campaign/application';
import { PartyStashDocument, PartyStashLine, PartyStashQuantity, ReviewedName } from '@pioneer/campaign/domain';
import type {
  CampaignId,
  CharacterId as CampaignCharacterId,
  PartyStashContents,
  ReviewedItemId,
} from '@pioneer/campaign/domain';
import { DrizzlePartyStashRepository } from '@pioneer/campaign/infrastructure';
import type { StoredPartyStash } from '@pioneer/campaign/infrastructure';
import { CharacterPartyStash } from '@pioneer/character/application';
import type { CharacterContentSource, StashLine, StashMove } from '@pioneer/character/application';
import {
  CharacterId,
  EMPTY_INVENTORY,
  InventoryItemId,
  InventorySchema,
  TransferRefusal,
} from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { ConflictError, message, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { Database } from './database';

/** Why a deposit is refused, as the party stash words it: it fills the stash. A line that is gone is a 404. */
const DEPOSIT_REFUSALS = {
  [TransferRefusal.NoLine]: undefined,
  [TransferRefusal.KeyItem]: PartyStashMessage.KeyItemLine,
  [TransferRefusal.Full]: PartyStashMessage.StashFull,
  [TransferRefusal.ShortCoins]: undefined,
} as const satisfies Record<TransferRefusal, string | undefined>;

/** Why a take is refused: it fills the character. */
const TAKE_REFUSALS = {
  ...DEPOSIT_REFUSALS,
  [TransferRefusal.Full]: PartyStashMessage.CharacterFull,
} as const satisfies Record<TransferRefusal, string | undefined>;

type Refusals = Record<TransferRefusal, string | undefined>;

/** One move: how its refusals read, the line it is about, and what it asks the character context to do. */
interface Move {
  readonly refusals: Refusals;
  readonly item: ReviewedItemId;
  readonly line: StashLine;
  readonly run: (characters: CharacterPartyStash, stash: Inventory) => Promise<StashMove>;
}

/** A refusal as the error it is: a line that is gone is a 404, the rest a 409 worded for the move. */
function refused(refusal: TransferRefusal, { refusals, item }: Move): Error {
  const key = refusals[refusal];
  return key === undefined
    ? new NotFoundError('InventoryItem', item)
    : new ConflictError(`The party stash move was refused: ${refusal}`, message(key));
}

/** The stored document as the inventory it is; a stash nothing was put in yet is empty. */
function inventoryOf(stored: StoredPartyStash | undefined): Inventory {
  return stored === undefined ? EMPTY_INVENTORY : InventorySchema.parse(stored.document);
}

/** The stash as the campaign shows it, its lines named from the content of `via`. */
async function viewOf(
  characters: CharacterPartyStash,
  stash: Inventory,
  via: CharacterId | undefined,
): Promise<PartyStashContents> {
  const named = await characters.name(stash, via);
  return {
    lines: named.map((each) =>
      PartyStashLine.parse({
        id: each.id,
        name: ReviewedName.parse(each.name),
        quantity: PartyStashQuantity.parse(each.quantity),
        ...(each.container === undefined ? {} : { container: each.container }),
      }),
    ),
  };
}

/**
 * The campaign context's `PartyStashKeeper` over the character context. It lives in the composition root because neither
 * context may import the other. A move writes the character and the stash in one transaction: the repositories are built
 * on it, so a conflict on either rolls both back.
 */
export class DatabasePartyStash extends PartyStashKeeper {
  readonly #db: Database;
  readonly #content: CharacterContentSource;
  readonly #clock: Clock;

  public constructor(db: Database, content: CharacterContentSource, clock: Clock) {
    super();
    this.#db = db;
    this.#content = content;
    this.#clock = clock;
  }

  public override async view(campaign: CampaignId, party: readonly CampaignCharacterId[]): Promise<PartyStashContents> {
    const stored = await new DrizzlePartyStashRepository(this.#db, this.#clock).load(campaign);
    const [via] = party;
    const characters = new CharacterPartyStash(new DrizzleCharacterRepository(this.#db), this.#content, this.#clock);
    return viewOf(characters, inventoryOf(stored), via === undefined ? undefined : CharacterId.parse(via));
  }

  public override async deposit(actor: UserId, campaign: CampaignId, move: StashLineMove): Promise<PartyStashContents> {
    const line = { character: CharacterId.parse(move.character), item: InventoryItemId.parse(move.item) };
    return this.#move(actor, campaign, {
      refusals: DEPOSIT_REFUSALS,
      item: move.item,
      line,
      run: async (characters, stash) => characters.deposit(actor, line, stash),
    });
  }

  public override async take(actor: UserId, campaign: CampaignId, move: StashLineMove): Promise<PartyStashContents> {
    const line = { character: CharacterId.parse(move.character), item: InventoryItemId.parse(move.item) };
    return this.#move(actor, campaign, {
      refusals: TAKE_REFUSALS,
      item: move.item,
      line,
      run: async (characters, stash) => characters.take(actor, line, stash),
    });
  }

  async #move(actor: UserId, campaign: CampaignId, move: Move): Promise<PartyStashContents> {
    return this.#db.transaction(async (tx) => {
      const stashes = new DrizzlePartyStashRepository(tx, this.#clock);
      const characters = new CharacterPartyStash(new DrizzleCharacterRepository(tx), this.#content, this.#clock);
      const stored = await stashes.load(campaign);
      const moved = await move.run(characters, inventoryOf(stored));
      if (moved.refusal !== undefined) {
        throw refused(moved.refusal, move);
      }
      await stashes.save(actor, {
        campaignId: campaign,
        document: PartyStashDocument.parse(moved.stash),
        expected: stored?.version,
      });
      return viewOf(characters, moved.stash, move.line.character);
    });
  }
}
