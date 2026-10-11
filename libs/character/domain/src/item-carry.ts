import { Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** How an item is carried: worn, held in one or two hands, stowed (in a container or loose) or dropped. */
export const CarryState = { Worn: 'worn', Held: 'held', Stowed: 'stowed', Dropped: 'dropped' } as const;
export type CarryState = ValueOf<typeof CarryState>;

/** A count of hands: those a held item takes, or those in use. */
export const Hands = Pg.smallint().nonnegative().brand<'Hands'>();
export type Hands = z.infer<typeof Hands>;

export const ONE_HAND = Hands.parse(1);

/** How many hands a character has to hold things in. */
export const HANDS_MAX = Hands.parse(2);

/** How an item is carried; a held item says in how many hands, one or two. */
export const CarrySchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal(CarryState.Worn) }),
  z.strictObject({ state: z.literal(CarryState.Held), hands: Hands.min(ONE_HAND).max(HANDS_MAX) }),
  z.strictObject({ state: z.literal(CarryState.Stowed) }),
  z.strictObject({ state: z.literal(CarryState.Dropped) }),
]);
export type Carry = z.infer<typeof CarrySchema>;

export const STOWED: Carry = { state: CarryState.Stowed };

/** A count of invested items. */
export const InvestedCount = Pg.smallint().nonnegative().brand<'InvestedCount'>();
export type InvestedCount = z.infer<typeof InvestedCount>;

/** The most items a character can have invested at once. */
export const INVESTED_MAX = InvestedCount.parse(10);

/** An item as the limits count it: how it is carried and whether it is invested. */
export interface Carried {
  readonly carry: Carry;
  readonly invested?: true | undefined;
}

/** The hands `items` hold things in. */
export function handsInUse(items: readonly Carried[]): Hands {
  return Hands.parse(
    items.reduce((total, { carry }) => total + (carry.state === CarryState.Held ? carry.hands : 0), 0),
  );
}

/** How many of `items` are invested. */
export function investedCount(items: readonly Carried[]): InvestedCount {
  return InvestedCount.parse(items.filter((each) => each.invested === true).length);
}
