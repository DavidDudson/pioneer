import { ContentId, SpellRank } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** The most poisons and oils a coating rune's space is stored as holding: they weigh next to nothing, so a count caps the list. */
const COATING_ITEMS_MAX = 20;

/** The spell a spell reservoir rune holds: which spell, and the rank it was cast into the weapon at. */
const StoredSpellSchema = z.strictObject({ spell: ContentId, rank: SpellRank }).readonly();

/**
 * What a character's own item holds beyond what it is and how it is carried, which the rune etched onto it gives
 * meaning to (ADR-0042). Each field belongs to one rune; an item whose rune is gone keeps the field until a player
 * clears it, and the field does nothing meanwhile.
 */
export const ItemStateSchema = z.strictObject({
  /** An animated weapon set free: it fights on its own until it falls (`rune:animated`). */
  released: z.literal(true).optional(),
  /** The poisons and oils kept in the extradimensional space of a coating rune, as the consumables they are. */
  coating: z.array(ContentId).max(COATING_ITEMS_MAX).readonly().optional(),
  /** The spell cast into a spell reservoir weapon, kept until it is expended (`rune:spell-reservoir`). */
  spell: StoredSpellSchema.optional(),
});
export type ItemState = z.infer<typeof ItemStateSchema>;

/** Whether `state` holds nothing, so the item keeps no state at all: no field, or a list with nothing in it. */
export function isEmptyState(state: ItemState): boolean {
  return Object.values(state).every((value) => value === undefined || (Array.isArray(value) && value.length === 0));
}
