import { SpendCount, SpendId, SpendKind, SpendTime } from '@pioneer/character/domain';
import type { SpendEntry, SpendLog } from '@pioneer/character/domain';
import { ContentId } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { costMessage, spendRows } from './spend-log-view';

const STRIDE = ContentId.parse('00000000-0000-4000-8000-000000000001');
const AT = SpendTime.parse('2026-10-16T12:00:00.000Z');
const NO_QUICKENED = 0 as SpendEntry['quickened'];

function entry(serial: string, cost: SpendEntry['cost']): SpendEntry {
  return {
    id: SpendId.parse(`00000000-0000-4000-8000-${serial.padStart(12, '0')}`),
    action: STRIDE,
    cost,
    at: AT,
    quickened: NO_QUICKENED,
  };
}

describe(spendRows, () => {
  it('lists the newest spend first, naming the action when it can', () => {
    const log: SpendLog = [
      entry('1', { kind: SpendKind.Actions, count: SpendCount.parse(1) }),
      entry('2', { kind: SpendKind.Reaction }),
    ];
    const rows = spendRows(log, new Map([[STRIDE, 'Stride']]));
    expect(rows.map(({ name }) => name)).toStrictEqual(['Stride', 'Stride']);
    expect(rows[0]?.cost.key).toBe('character.sheet.spend.costReaction');
    expect(rows[1]?.cost.key).toBe('character.sheet.spend.costOne');
  });

  it('carries when each spend happened', () => {
    const rows = spendRows([entry('1', { kind: SpendKind.Free })], new Map());
    expect(rows[0]?.at.equals(Temporal.Instant.from(AT))).toBe(true);
  });

  it('leaves the name out for an action the content does not have', () => {
    const rows = spendRows([entry('1', { kind: SpendKind.Free })], new Map());
    expect(rows[0]?.name).toBeUndefined();
  });
});

describe(costMessage, () => {
  it('words a count of actions with the count', () => {
    const cost = costMessage({ kind: SpendKind.Actions, count: SpendCount.parse(2) });
    expect(cost).toStrictEqual({ key: 'character.sheet.spend.costMany', params: { count: 2 } });
  });
});
