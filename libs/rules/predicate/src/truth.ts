import type { ValueOf } from '@pioneer/shared/kernel';

/**
 * A predicate's verdict under Kleene's three-valued logic (ADR-0002). `unknown` means the answer depends on facts
 * nobody has supplied yet, such as the terrain or the action being taken.
 */
export const Truth = {
  True: 'true',
  False: 'false',
  Unknown: 'unknown',
} as const;
export type Truth = ValueOf<typeof Truth>;

export function truthOf(value: boolean): Truth {
  return value ? Truth.True : Truth.False;
}

export function not(truth: Truth): Truth {
  if (truth === Truth.Unknown) {
    return Truth.Unknown;
  }
  return truthOf(truth === Truth.False);
}

/** False if any is false, otherwise unknown if any is unknown. Empty is true. */
export function all(truths: readonly Truth[]): Truth {
  if (truths.includes(Truth.False)) {
    return Truth.False;
  }
  return truths.includes(Truth.Unknown) ? Truth.Unknown : Truth.True;
}

/** True if any is true, otherwise unknown if any is unknown. Empty is false. */
export function any(truths: readonly Truth[]): Truth {
  if (truths.includes(Truth.True)) {
    return Truth.True;
  }
  return truths.includes(Truth.Unknown) ? Truth.Unknown : Truth.False;
}

/** Exactly one is true. Unknown while the unknowns could still make it one, or make it more than one. */
export function exactlyOne(truths: readonly Truth[]): Truth {
  const trueCount = truths.filter((truth) => truth === Truth.True).length;
  if (trueCount > 1) {
    return Truth.False;
  }
  const unknownCount = truths.filter((truth) => truth === Truth.Unknown).length;
  if (unknownCount > 0) {
    return Truth.Unknown;
  }
  return truthOf(trueCount === 1);
}

/** All true or all false. False as soon as one is true and another false; otherwise unknown while any is. */
export function allSame(truths: readonly Truth[]): Truth {
  if (truths.includes(Truth.True) && truths.includes(Truth.False)) {
    return Truth.False;
  }
  return truths.includes(Truth.Unknown) ? Truth.Unknown : Truth.True;
}

/** Material implication: `not condition or consequence`. */
export function implies(condition: Truth, consequence: Truth): Truth {
  return any([not(condition), consequence]);
}
