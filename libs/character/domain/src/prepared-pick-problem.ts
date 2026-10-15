import type { ValueOf } from '@pioneer/shared/kernel';

/** Why a stored pick naming a loaded spell isn't on offer in its slot. */
export const PreparedPickProblem = {
  /** An uncommon or rare spell the build lists no access to; with access it would fit. */
  NoAccess: 'noAccess',
  /** A spell of another tradition, too high a rank, a cantrip in a spell slot or a spell in a cantrip slot. */
  Unfit: 'unfit',
  /** In a pool's slot, a spell the pool doesn't take (a divine font's other font). */
  NotInPool: 'notInPool',
} as const;
export type PreparedPickProblem = ValueOf<typeof PreparedPickProblem>;
