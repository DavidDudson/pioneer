/** The total of `values`; an empty list is `0`. */
export function sum(values: Iterable<number>): number {
  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total;
}
