import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterId, PartyCharacterName } from './campaign-fields';
import { ReviewedItemId, ReviewedName } from './campaign-item-approvals';

/** How many of an item one party stash line holds. */
export const PartyStashQuantity = Pg.smallint().positive().brand<'PartyStashQuantity'>();
export type PartyStashQuantity = z.infer<typeof PartyStashQuantity>;

/** One line of the party stash: an ordinary item, or a container with the lines inside it pointing at it. */
export const PartyStashLine = z.object({
  id: ReviewedItemId,
  name: ReviewedName,
  quantity: PartyStashQuantity,
  /** The container the line sits in; none when it is loose in the stash. */
  container: ReviewedItemId.optional(),
});
export type PartyStashLine = z.output<typeof PartyStashLine>;

/** One of the viewer's own live characters in the party. */
export const StashCharacter = z.object({ characterId: CharacterId, name: PartyCharacterName });
export type StashCharacter = z.output<typeof StashCharacter>;

/**
 * What the party holds in common (ADR-0064): one flat container of lines, in the order they were put in. It belongs
 * to no character, so what it holds, containers included, adds Bulk to no one.
 */
export const PartyStashContents = z.object({
  lines: z.array(PartyStashLine).readonly(),
});
export type PartyStashContents = z.output<typeof PartyStashContents>;

/** The stash as one member sees it: what it holds, and the member's own characters that may take from it or put into it. */
export const PartyStash = PartyStashContents.extend({
  characters: z.array(StashCharacter).readonly(),
});
export type PartyStash = z.output<typeof PartyStash>;

/** The line of one of the member's own characters to put into the party stash, with what it holds. */
export const DepositBody = z.object({ from: CharacterId, item: ReviewedItemId });
export type DepositBody = z.output<typeof DepositBody>;

/** The stash line to take, with what it holds, and the member's own character that takes it. */
export const TakeBody = z.object({ to: CharacterId, item: ReviewedItemId });
export type TakeBody = z.output<typeof TakeBody>;

/**
 * The stash as the campaign context stores it: an inventory document it does not read. The character context owns the
 * shape (`Inventory`), so the stash is moved with the same rules as a character's lines (`giveLine`).
 */
export const PartyStashDocument = z.json();
export type PartyStashDocument = z.output<typeof PartyStashDocument>;
