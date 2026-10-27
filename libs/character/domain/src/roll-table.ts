import * as z from 'zod';

import { PickBound } from './pick-source';
import type { PickIndex, PickSource } from './pick-source';

/** What a roll table is called: its key in the registry, and the message key of its title. */
export const RollTableId = z.string().min(1).brand<'RollTableId'>();
export type RollTableId = z.infer<typeof RollTableId>;

/** One line of a roll table: the text a roll on that line gives. */
export const RollTableEntry = z.string().trim().min(1).brand<'RollTableEntry'>();
export type RollTableEntry = z.infer<typeof RollTableEntry>;

/**
 * A table to roll on, as a tabletop roll table is: a die as big as it has lines, each line one result. The lines
 * are in order, so line `n` is the result of rolling `n`.
 */
export const RollTable = z.strictObject({
  id: RollTableId,
  entries: z.array(RollTableEntry).min(1).readonly(),
});
export type RollTable = z.infer<typeof RollTable>;

/** The line `source` picks on `table`, each line as likely as another. */
export function rollOn(source: PickSource, table: RollTable): RollTableEntry {
  const picked: PickIndex = source.below(PickBound.parse(table.entries.length));
  return table.entries[picked] ?? RollTableEntry.parse(table.id);
}
