import { rollView } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';

import type { RollHistoryEntry } from '../../data/roll-history-entry';

/** A history entry as the roll card shows it: the dice, degree and toggles it was rolled with, not today's. */
export function historyRollView(entry: RollHistoryEntry): RollView {
  const { at, expression, roll, degree, damage, reasons, check } = entry;

  return rollView(at, { expression, roll, degree, damage, reasons, check });
}
