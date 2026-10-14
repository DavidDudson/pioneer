import { RuleElementKey } from '@pioneer/rules/sdk';

/**
 * Foundry's `ItemAlteration` in Pioneer's spelling (ADR-0008): the items it reaches become the `items` predicate over
 * their own roll options. `itemType` is `item:type:<type>`, and the statements of Foundry's predicate that read only
 * the item (`item:trait:shield`) move there too, while the rest stay the element's predicate over the character. What
 * this cannot carry over (an alteration of the item that holds it, `itemId`, a property the engine has no number or
 * trait for, such as `description` or `other-tags`, and a value read from the actor or a pick) is left
 * as it is, so the element fails and is kept for the backlog.
 */

const ITEM_NAMESPACE = 'item:';

/** The text of every roll option a predicate statement reads. */
function optionsOf(statement: unknown): readonly string[] {
  if (typeof statement === 'string') {
    return [statement];
  }
  if (Array.isArray(statement)) {
    return statement.flatMap((each: unknown) => optionsOf(each));
  }
  if (typeof statement === 'object' && statement !== null) {
    return Object.values(statement).flatMap((each: unknown) => optionsOf(each));
  }
  return [];
}

/** Whether a statement reads item roll options and nothing else. */
export function readsOnlyItem(statement: unknown): boolean {
  const options = optionsOf(statement);
  return options.length > 0 && options.every((option) => option.startsWith(ITEM_NAMESPACE));
}

/** A predicate split into the statements about the item and those about the character. */
interface SplitPredicate {
  readonly item: readonly unknown[];
  readonly actor: readonly unknown[];
}

function splitPredicate(raw: object): SplitPredicate {
  const statements: readonly unknown[] = 'predicate' in raw && Array.isArray(raw.predicate) ? raw.predicate : [];
  return {
    item: statements.filter((statement) => readsOnlyItem(statement)),
    actor: statements.filter((statement) => !readsOnlyItem(statement)),
  };
}

/** An `ItemAlteration` with `items` in Pioneer's spelling; any other element, or one reaching no item, as it is. */
export function withItemScope(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.ItemAlteration) {
    return raw;
  }
  const { item, actor } = splitPredicate(raw);
  const type = 'itemType' in raw && typeof raw.itemType === 'string' ? [`${ITEM_NAMESPACE}type:${raw.itemType}`] : [];
  const items = [...type, ...item];
  if (items.length === 0) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => field !== 'itemType' && field !== 'predicate');
  return { ...Object.fromEntries(rest), items, ...(actor.length > 0 ? { predicate: actor } : {}) };
}
