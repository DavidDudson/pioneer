import { Boundary, UseCountdown, UseCountKey } from './counted-resources';
import type { CountedMaximum, SpentCounts } from './counted-resources';
import { ResourceCount } from './resource-count';

const NONE = ResourceCount.parse(0);
const ONE_ROUND = UseCountdown.parse(1);

/** The counts of a play state a countdown reads and writes. */
type UseCounts = Pick<SpentCounts, 'uses' | 'countdowns'>;

/** The maxima of the uses, by key. */
type UseMaxima = ReadonlyMap<UseCountKey, CountedMaximum>;

/** `record` without the entries of `keys`. */
function without<Value>(
  record: Partial<Record<UseCountKey, Value>>,
  keys: readonly UseCountKey[],
): Partial<Record<UseCountKey, Value>> {
  const kept: Partial<Record<UseCountKey, Value>> = {};
  for (const [key, value] of Object.entries<Value | undefined>(record)) {
    if (value !== undefined && !keys.some((back) => back === key)) {
      kept[UseCountKey.parse(key)] = value;
    }
  }
  return kept;
}

/** `counts` with the spent uses and the countdown of `keys` cleared: those uses are back, as Rest, daily preparations or Reset give them. */
export function usesBack(counts: UseCounts, keys: readonly UseCountKey[]): UseCounts {
  return { uses: without(counts.uses, keys), countdowns: without(counts.countdowns, keys) };
}

/**
 * `counts` after a use of `key` is spent: the first use of a period that comes back by a countdown (a minute to an
 * hour) starts it, and later uses of the same period leave it running.
 */
export function countdownStarted(counts: UseCounts, maxima: UseMaxima, key: UseCountKey): UseCounts {
  const countdown = maxima.get(key)?.countdown;
  if (countdown === undefined || counts.countdowns[key] !== undefined) {
    return counts;
  }
  return { ...counts, countdowns: { ...counts.countdowns, [key]: countdown } };
}

/** `counts` after a use of `key` is refunded: a countdown nothing is left spent under is cleared. */
export function countdownCleared(counts: UseCounts, key: UseCountKey): UseCounts {
  const spent = counts.uses[key] ?? NONE;
  if (spent > NONE || counts.countdowns[key] === undefined) {
    return counts;
  }
  return { uses: counts.uses, countdowns: without(counts.countdowns, [key]) };
}

/** The keys of the uses that come back at the start of a turn: a turn or round frequency, or a countdown that runs out. */
function backAtTurnStart(counts: UseCounts, maxima: UseMaxima): readonly UseCountKey[] {
  return [...maxima].flatMap(([key, { boundary }]) => {
    const running = counts.countdowns[key];
    const periodic = boundary === Boundary.Turn || boundary === Boundary.Round;
    return periodic || (running !== undefined && running <= ONE_ROUND) ? [key] : [];
  });
}

/**
 * `counts` at the start of a turn, which is a round: turn and round frequencies come back, every other countdown goes
 * down a round, and a use whose countdown reaches 0 comes back.
 */
export function usesAtTurnStart(counts: UseCounts, maxima: UseMaxima): UseCounts {
  const back = backAtTurnStart(counts, maxima);
  const countdowns: Partial<Record<UseCountKey, UseCountdown>> = {};
  for (const [key, rounds] of Object.entries(counts.countdowns)) {
    if (rounds !== undefined && rounds > ONE_ROUND) {
      countdowns[UseCountKey.parse(key)] = UseCountdown.parse(rounds - ONE_ROUND);
    }
  }
  return usesBack({ ...counts, countdowns }, back);
}

/** The rounds left before the uses of `key` come back by themselves, when a countdown is running. */
export function roundsLeft(counts: Pick<SpentCounts, 'countdowns'>, key: UseCountKey): UseCountdown | undefined {
  return counts.countdowns[key];
}
