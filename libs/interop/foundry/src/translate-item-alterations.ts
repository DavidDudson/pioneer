import { RuleElementKey } from '@pioneer/rules/sdk';

import { htmlToRichText } from './html-rich-text';

/**
 * Foundry's `ItemAlteration` in Pioneer's spelling (ADR-0008): the items it reaches become the `items` predicate over
 * their own roll options. `itemType` is `item:type:<type>`, and the statements of Foundry's predicate that read only
 * the item (`item:trait:shield`) move there too, while the rest stay the element's predicate over the character. What
 * this cannot carry over (an alteration of the item that holds it, `itemId`, a property the engine has no number or
 * trait for, such as `other-tags`, and a value read from the actor or a pick) is left
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
function readsOnlyItem(statement: unknown): boolean {
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

/** An `ItemAlteration` whose description is Foundry's list of one text block, with that text as rich text; any other element as it is. */
function withDescriptionText(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('property' in raw) || raw.property !== 'description') {
    return raw;
  }
  const blocks = 'value' in raw && Array.isArray(raw.value) ? (raw.value as readonly unknown[]) : [];
  const [block] = blocks;
  const text = typeof block === 'object' && block !== null && 'text' in block ? block.text : undefined;
  return blocks.length === 1 && typeof text === 'string'
    ? { ...raw, value: htmlToRichText(`<p>${text}</p>`).richText }
    : raw;
}

/** An `ItemAlteration` with `items` in Pioneer's spelling; any other element, or one reaching no item, as it is. */
export function withItemScope(scoped: unknown): unknown {
  if (
    typeof scoped !== 'object' ||
    scoped === null ||
    !('key' in scoped) ||
    scoped.key !== RuleElementKey.ItemAlteration
  ) {
    return scoped;
  }
  const described = withDescriptionText(scoped);
  const raw = typeof described === 'object' && described !== null ? described : scoped;
  const { item, actor } = splitPredicate(raw);
  const type = 'itemType' in raw && typeof raw.itemType === 'string' ? [`${ITEM_NAMESPACE}type:${raw.itemType}`] : [];
  const items = [...type, ...item];
  if (items.length === 0) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => field !== 'itemType' && field !== 'predicate');
  return { ...Object.fromEntries(rest), items, ...(actor.length > 0 ? { predicate: actor } : {}) };
}
