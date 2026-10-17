import { creatureReport } from '@pioneer/interop/foundry';
import type { CreatureSelection } from '@pioneer/interop/foundry';

/** The creatures a book would bring and what the stat block has no home for. Nothing is written for them yet. */
export function formatCreatures(selection: CreatureSelection): string {
  const { imported, skipped, fieldGaps } = creatureReport(selection);
  const total = imported.reduce((sum, { count }) => sum + count, 0);
  const skippedTotal = skipped.reduce((sum, { count }) => sum + count, 0);
  return [
    `Would import ${total} creatures:`,
    ...imported.map(({ book, role, level, count }) => `  ${book}  ${role}  level ${level}  ${count}`),
    `Skipped ${skippedTotal} actors:`,
    ...skipped.map(({ reason, detail, count }) => `  ${reason}  ${detail === '' ? '-' : detail}  ${count}`),
    `Actor fields with no home in the stat block ${fieldGaps.length}, by creatures having them:`,
    ...fieldGaps.map(({ key, count }) => `  ${key}  ${count}`),
  ].join('\n');
}
