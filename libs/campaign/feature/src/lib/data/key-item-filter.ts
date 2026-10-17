import type { KeyItemView } from '@pioneer/campaign/domain';

/** The filter value that keeps every key item. */
export const ALL_HOLDERS = 'all';

/** The filter value that keeps the key items no character holds. */
export const STASH_HOLDER = 'stash';

/** A holder a key item can be filtered by: a character's id and name. */
export interface KeyItemHolderChoice {
  readonly id: string;
  readonly name: string;
}

/** The characters holding at least one key item, by name, each once. */
export function holderChoices(keyItems: readonly KeyItemView[]): readonly KeyItemHolderChoice[] {
  const byId = new Map<string, string>();
  for (const { holder, holderName } of keyItems) {
    if (holder !== undefined && holderName !== undefined) {
      byId.set(holder, holderName);
    }
  }
  return [...byId].map(([id, name]) => ({ id, name })).toSorted((left, right) => left.name.localeCompare(right.name));
}

/** The key items `filter` keeps: all, those in the party stash, or those one character holds. */
export function filterKeyItems(keyItems: readonly KeyItemView[], filter: string): readonly KeyItemView[] {
  if (filter === ALL_HOLDERS) {
    return keyItems;
  }
  return keyItems.filter(({ holder }) => (filter === STASH_HOLDER ? holder === undefined : holder === filter));
}
