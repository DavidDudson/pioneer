/** Plain code unit order, the same in every locale, so server and browser agree. */
export function byCodeUnit(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}
