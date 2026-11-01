import type {
  CampaignId,
  CharacterId,
  PartyStashContents,
  PartyStashLine,
  ReviewedItemId,
} from '@pioneer/campaign/domain';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { PartyStashKeeper } from './party-stash-keeper';
import type { StashLineMove } from './party-stash-keeper';

/** A move a test records. */
export interface RecordedMove {
  readonly campaign: CampaignId;
  readonly character: CharacterId;
  readonly item: ReviewedItemId;
  readonly direction: 'deposit' | 'take';
}

/**
 * Adapter for tests: the lines each character holds and the stash holds, moved whole between them. It does not nest
 * lines; the character context's `giveLine` does that, and has its own tests.
 */
export class InMemoryPartyStashKeeper extends PartyStashKeeper {
  public readonly moves: RecordedMove[] = [];
  readonly #held = new Map<ReviewedItemId, { character: CharacterId | undefined; line: PartyStashLine }>();

  /** The character holds this line. */
  public characterHolds(character: CharacterId, line: PartyStashLine): this {
    this.#held.set(line.id, { character, line });
    return this;
  }

  /** The stash holds this line. */
  public stashHolds(line: PartyStashLine): this {
    this.#held.set(line.id, { character: undefined, line });
    return this;
  }

  public override async view(): Promise<PartyStashContents> {
    return this.#stash();
  }

  public override async deposit(
    _actor: UserId,
    campaign: CampaignId,
    { character, item }: StashLineMove,
  ): Promise<PartyStashContents> {
    const found = this.#held.get(item);
    if (found?.character !== character) {
      throw new NotFoundError('InventoryItem', item);
    }
    this.#held.set(item, { character: undefined, line: found.line });
    this.moves.push({ campaign, character, item, direction: 'deposit' });
    return this.#stash();
  }

  public override async take(
    _actor: UserId,
    campaign: CampaignId,
    { character, item }: StashLineMove,
  ): Promise<PartyStashContents> {
    const found = this.#held.get(item);
    if (found === undefined || found.character !== undefined) {
      throw new NotFoundError('InventoryItem', item);
    }
    this.#held.set(item, { character, line: found.line });
    this.moves.push({ campaign, character, item, direction: 'take' });
    return this.#stash();
  }

  #stash(): PartyStashContents {
    return { lines: [...this.#held.values()].filter((each) => each.character === undefined).map((each) => each.line) };
  }
}
