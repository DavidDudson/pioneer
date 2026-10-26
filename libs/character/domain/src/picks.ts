import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { PickBound } from './pick-source';
import type { PickIndex, PickSource } from './pick-source';

/** Why nothing was picked: there was nothing to pick from, or nothing in the list had a chance. */
export const PickRefusal = { Empty: 'empty' } as const;
export type PickRefusal = ValueOf<typeof PickRefusal>;

/** A pick, or why there was none. */
export type PickOutcome<Item> =
  | { readonly ok: true; readonly picked: Item }
  | { readonly ok: false; readonly refusal: PickRefusal };

/** How likely an entry is against the others in its list; zero never comes up. */
export const PickWeight = z.int().nonnegative().brand<'PickWeight'>();
export type PickWeight = z.infer<typeof PickWeight>;

/** An entry of a weighted list. */
export interface Weighted<Item> {
  readonly item: Item;
  readonly weight: PickWeight;
}

const NONE = 0;
const ONE = 1;

function refused<Item>(): PickOutcome<Item> {
  return { ok: false, refusal: PickRefusal.Empty };
}

/** One of `items`, each equally likely; an empty list is refused. */
export function pickOne<Item>(source: PickSource, items: readonly Item[]): PickOutcome<Item> {
  if (items.length === NONE) {
    return refused();
  }
  const index = source.below(PickBound.parse(items.length));
  const picked = items[index];
  return picked === undefined ? refused() : { ok: true, picked };
}

/** One of `entries`, each as likely as its weight against the total; no entries, or only zero weights, is refused. */
export function pickWeighted<Item>(source: PickSource, entries: readonly Weighted<Item>[]): PickOutcome<Item> {
  const total = entries.reduce((sum, { weight }) => sum + weight, NONE);
  if (total === NONE) {
    return refused();
  }
  const ticket = source.below(PickBound.parse(total));
  let reached = NONE;
  for (const { item, weight } of entries) {
    reached += weight;
    if (ticket < reached) {
      return { ok: true, picked: item };
    }
  }
  return refused();
}

/** `items` in a random order, each order equally likely (Fisher-Yates); an empty list shuffles to an empty list. */
export function shuffle<Item>(source: PickSource, items: readonly Item[]): readonly Item[] {
  const result = [...items];
  for (let end = result.length - ONE; end > NONE; end -= ONE) {
    const other: PickIndex = source.below(PickBound.parse(end + ONE));
    const kept = result[end];
    const swapped = result[other];
    if (kept !== undefined && swapped !== undefined) {
      result[end] = swapped;
      result[other] = kept;
    }
  }
  return result;
}
