/** A run of items sharing a key, with its first item. */
export type Run<Item> = readonly [Item, readonly Item[]];

/** `items` split into runs of the same key, in order: prepared slots come entry by entry, rank by rank. */
export function runs<Item>(items: readonly Item[], keyOf: (item: Item) => string): Run<Item>[] {
  const grouped: [Item, Item[]][] = [];
  for (const item of items) {
    const last = grouped.at(-1);
    if (last !== undefined && keyOf(last[0]) === keyOf(item)) {
      last[1].push(item);
    } else {
      grouped.push([item, [item]]);
    }
  }
  return grouped;
}
