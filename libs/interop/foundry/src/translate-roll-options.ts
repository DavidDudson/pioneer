import { RuleElementKey } from '@pioneer/rules/sdk';

import { namespaced, selectorOf } from './translate-modifiers';

/**
 * Foundry's `RollOption` in Pioneer's spelling (ADR-0008): the option it sets is in a namespace, a domain is a selector
 * in Pioneer's vocabulary, and fields that only steer where Foundry shows the toggle are dropped. What this cannot
 * carry over (`mergeable` toggles that pool their suboptions across items, `disabledIf`, a `toggleable` that is not a
 * flag, `count`, `requiresEquipped`) is left as it is, so the element fails and is kept for the backlog.
 */

/** Fields that only place a toggle on Foundry's sheet or time its derivation, with no effect on the option it sets. */
const PLACEMENT_FIELDS: ReadonlySet<string> = new Set(['alwaysActive', 'placement', 'phase']);

/** What Foundry writes in a suboption's label for the name of the item the suboption is on. */
const ITEM_NAME = '{item|name}';

function suboptionOf(suboption: unknown, item: string): unknown {
  if (typeof suboption !== 'object' || suboption === null || !('label' in suboption)) {
    return suboption;
  }
  const { label } = suboption;
  return { ...suboption, label: label === ITEM_NAME ? item : label };
}

/**
 * A `RollOption` as Pioneer's element: its `option` in a namespace (a bare name is under `option`, as predicates read
 * it), its `domain` as a selector, a suboption labelled `{item|name}` by the name of its item, and the placement
 * fields dropped. Any other element is as it is.
 */
export function withRollOption(raw: unknown, item: string): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.RollOption) {
    return raw;
  }
  const kept = Object.entries(raw).filter(([field]) => !PLACEMENT_FIELDS.has(field));
  const shaped = Object.fromEntries(kept.map(([field, value]) => [field, shapedField(field, value, item)]));
  return shaped;
}

function shapedField(field: string, value: unknown, item: string): unknown {
  if (field === 'option' && typeof value === 'string') {
    return namespaced(value);
  }
  if (field === 'domain' && typeof value === 'string') {
    return selectorOf(value);
  }
  if (field === 'suboptions' && Array.isArray(value)) {
    return value.map((suboption) => suboptionOf(suboption, item));
  }
  return value;
}
