import { Level } from '@pioneer/rules/sdk';

const HALF = 2;

/**
 * Reads a value that only grows as the level rises (a skill's rank, the entries that train it) at the levels asked,
 * with as few reads as it takes: where the values at the two ends of a range agree, every level between them takes
 * that value. Each level's value is read once, at the first level asked or at a level halving a range that differs.
 */
export function bisected<TValue>(
  read: (level: Level) => TValue,
  same: (left: TValue, right: TValue) => boolean,
  range: { readonly first: Level; readonly last: Level },
): (level: Level) => TValue {
  const exact = new Map<Level, TValue>();
  const readOnce = (level: Level): TValue => {
    const value = exact.get(level) ?? read(level);
    exact.set(level, value);
    return value;
  };
  return (level) => {
    let low = range.first;
    let high = range.last;
    while (level > low && level < high) {
      if (same(readOnce(low), readOnce(high))) {
        return readOnce(low);
      }
      const middle = Level.parse(Math.floor((low + high) / HALF));
      if (middle === low) {
        break;
      }
      if (level <= middle) {
        high = middle;
      } else {
        low = middle;
      }
    }
    return readOnce(level);
  };
}
