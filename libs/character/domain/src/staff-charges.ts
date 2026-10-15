import { Slug, SpellRank } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { InventoryItemId } from './inventory';
import { ResourceCount } from './resource-count';

const NONE = ResourceCount.parse(0);

/**
 * The charges of the staff prepared for the day, as inputs: the most it holds, set at daily preparations from the
 * character's spell ranks (the content does not give it), and the charges spent since. Only one staff is prepared at
 * a time, and none is kept past the next daily preparations.
 */
export const StaffChargesSchema = z.partialRecord(
  InventoryItemId,
  z.strictObject({ max: ResourceCount, spent: ResourceCount.default(NONE) }),
);
export type StaffCharges = z.infer<typeof StaffChargesSchema>;

/** The spell slot a prepared caster expends at daily preparations to add charges: an entry's own slot of a rank. */
export const StaffSlotSchema = z.strictObject({ entry: Slug, rank: SpellRank });
export type StaffSlot = z.infer<typeof StaffSlotSchema>;

/** The charges `charges` holds for `item`: its maximum less what is spent; 0 for a staff not prepared. */
export function chargesHeld(charges: StaffCharges, item: InventoryItemId): ResourceCount {
  const known = charges[item];
  return known === undefined ? NONE : ResourceCount.parse(Math.max(known.max - known.spent, 0));
}

/** The staff to prepare at daily preparations and the slot a prepared caster expends for more charges, if any. */
export interface StaffChoice {
  readonly staff?: InventoryItemId | undefined;
  readonly slot?: StaffSlot | undefined;
}
