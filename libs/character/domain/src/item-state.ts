import * as z from 'zod';

/**
 * What a character's own item holds beyond what it is and how it is carried, which the rune etched onto it gives
 * meaning to (ADR-0042). Each field belongs to one rune; an item whose rune is gone keeps the field until a player
 * clears it, and the field does nothing meanwhile.
 */
export const ItemStateSchema = z.strictObject({
  /** An animated weapon set free: it fights on its own until it falls (`rune:animated`). */
  released: z.literal(true).optional(),
});
export type ItemState = z.infer<typeof ItemStateSchema>;

/** Whether `state` holds nothing, so the item keeps no state at all. */
export function isEmptyState(state: ItemState): boolean {
  return Object.values(state).every((value) => value === undefined);
}
