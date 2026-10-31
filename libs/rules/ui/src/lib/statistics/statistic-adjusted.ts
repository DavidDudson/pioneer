import { LineStatusKind } from '@pioneer/rules/engine';
import type { StatisticValue } from '@pioneer/rules/engine';
import { OriginHopKind } from '@pioneer/rules/sdk';

/**
 * Whether a user added a modifier to the statistic by hand that counts toward its total. A set override pins the
 * total instead, which the row marks as pinned.
 */
export function isAdjustedByHand({ lines, pinnedBy }: StatisticValue): boolean {
  return (
    pinnedBy === undefined &&
    lines.some(
      ({ modifier, status }) =>
        status.kind === LineStatusKind.Applied &&
        modifier.origin.hops.some(({ kind }) => kind === OriginHopKind.Override),
    )
  );
}
