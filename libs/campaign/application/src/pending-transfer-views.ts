import { isCoinTransfer } from '@pioneer/campaign/domain';
import type {
  CoinTransfer,
  ItemTransfer,
  PendingTransfers,
  PendingTransferView,
  ReviewedName,
  Transfer,
} from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

import type { CharacterDirectory, CharacterSummary } from './character-directory';
import type { TransferLines } from './transfer-lines';

/** Whether the user owns the character and it is live (an archived one takes no part, ADR-0062). */
function ownsLive(actor: UserId, character: CharacterSummary | undefined): boolean {
  return character?.ownerId === actor && !character.archived;
}

/** The ports the views are read through. */
interface ViewPorts {
  readonly characters: CharacterDirectory;
  readonly lines: TransferLines;
}

/** The two sides of an offer, by name, with which of them the actor owns. */
interface Sides {
  readonly giver: CharacterSummary;
  readonly recipient: CharacterSummary;
}

/** The sides of an item offer, and the name of the line on offer. */
interface ItemSides extends Sides {
  readonly itemName: ReviewedName;
}

/** A coin offer as the actor sees it. */
function coinView(actor: UserId, transfer: CoinTransfer, { giver, recipient }: Sides): PendingTransferView {
  return {
    kind: 'coins',
    id: transfer.id,
    from: transfer.from,
    fromName: giver.name,
    to: transfer.to,
    toName: recipient.name,
    coins: transfer.coins,
    asGiver: ownsLive(actor, giver),
    asRecipient: ownsLive(actor, recipient),
  };
}

/** An item offer as the actor sees it, by the name of the line. */
function itemView(
  actor: UserId,
  transfer: ItemTransfer,
  { giver, recipient, itemName }: ItemSides,
): PendingTransferView {
  return {
    kind: 'item',
    id: transfer.id,
    from: transfer.from,
    fromName: giver.name,
    to: transfer.to,
    toName: recipient.name,
    item: transfer.item,
    itemName,
    asGiver: ownsLive(actor, giver),
    asRecipient: ownsLive(actor, recipient),
  };
}

/**
 * The pending offers, of items and of coins, that involve a live character of the actor's, as giver or as recipient,
 * in the order given, with the names to show them by. An item offer whose line is gone is left out.
 */
export async function pendingTransferViews(
  actor: UserId,
  pending: readonly Transfer[],
  { characters, lines }: ViewPorts,
): Promise<PendingTransfers> {
  const named = await characters.byIds(pending.flatMap(({ from, to }) => [from, to]));
  const involved = pending.filter(({ from, to }) => ownsLive(actor, named.get(from)) || ownsLive(actor, named.get(to)));
  const views = await Promise.all(
    involved.map(async (transfer): Promise<PendingTransferView | undefined> => {
      const giver = named.get(transfer.from);
      const recipient = named.get(transfer.to);
      if (giver === undefined || recipient === undefined) {
        return undefined;
      }
      if (isCoinTransfer(transfer)) {
        return coinView(actor, transfer, { giver, recipient });
      }
      const line = await lines.describe(transfer.from, transfer.item);
      return line === undefined ? undefined : itemView(actor, transfer, { giver, recipient, itemName: line.name });
    }),
  );
  return views.filter((view) => view !== undefined);
}
