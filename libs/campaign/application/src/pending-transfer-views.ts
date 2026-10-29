import type { ItemTransfer, PendingTransferView } from '@pioneer/campaign/domain';
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

/**
 * The pending offers that involve a live character of the actor's, as giver or as recipient, in the order given, with
 * the names to show them by. An offer whose line is gone is left out.
 */
export async function pendingTransferViews(
  actor: UserId,
  pending: readonly ItemTransfer[],
  { characters, lines }: ViewPorts,
): Promise<readonly PendingTransferView[]> {
  const named = await characters.byIds(pending.flatMap(({ from, to }) => [from, to]));
  const involved = pending.filter(({ from, to }) => ownsLive(actor, named.get(from)) || ownsLive(actor, named.get(to)));
  const views = await Promise.all(
    involved.map(async (transfer): Promise<PendingTransferView | undefined> => {
      const giver = named.get(transfer.from);
      const recipient = named.get(transfer.to);
      const line = await lines.describe(transfer.from, transfer.item);
      if (giver === undefined || recipient === undefined || line === undefined) {
        return undefined;
      }
      return {
        id: transfer.id,
        from: transfer.from,
        fromName: giver.name,
        to: transfer.to,
        toName: recipient.name,
        item: transfer.item,
        itemName: line.name,
        asGiver: ownsLive(actor, giver),
        asRecipient: ownsLive(actor, recipient),
      };
    }),
  );
  return views.filter((view) => view !== undefined);
}
