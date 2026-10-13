import type { GrantedItem } from './grant-walk';

/** `items`, less each condition another one among them overrides (_blinded_ replaces _dazzled_). */
export function withoutOverridden(items: readonly GrantedItem[]): readonly GrantedItem[] {
  const overridden = new Set(items.flatMap(({ entry }) => entry.overrides ?? []));
  return overridden.size === 0 ? items : items.filter(({ entry }) => !overridden.has(entry.id));
}
