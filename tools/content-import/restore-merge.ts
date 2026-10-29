/**
 * The per-entry merge of `restore-additions.ts`: what a re-imported entry takes back from the one committed at the
 * ref (ADR-0031: the committed pack is the source of truth). The merge is per field:
 *
 * - `description`: the ref wins. Hand edits restore link text, names and typos the import loses or re-breaks.
 * - `rules`: when the ref holds a rule the import lacks, the ref's whole list wins, since a hand-fixed rule and the
 *   import's version of it cannot be told apart per rule. When both hold the same rules, the ref's order is kept.
 * - `traits`: a trait the ref has and the import lacks is added after the import's.
 * - `data`: a key the ref has and the import dropped or left blank (`dismiss`, `modes`, `recovery`,
 *   `prerequisitePredicate`, ...) comes back. Keys the import now sets stay, so its new coverage survives.
 *
 * Everything else is the import's.
 */
export type Json = Record<string, unknown>;

export interface Entry {
  readonly id: string;
  readonly name: string;
  readonly description?: unknown;
  readonly rules?: unknown;
  readonly traits?: readonly string[];
  readonly data?: Json;
}

export interface Restored {
  readonly entry: Entry;
  readonly fields: readonly string[];
}

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/** Whether a data value says nothing: the import writes `{}` where a hand edit had the value. */
function isBlank(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return typeof value === 'object' && Object.keys(value).length === 0;
}

function ruleSet(rules: unknown): Set<string> {
  const list = (rules ?? []) as readonly unknown[];
  return new Set(list.map((rule) => JSON.stringify(rule)));
}

function mergedRules(committed: Entry, fresh: Entry): Restored {
  const have = ruleSet(fresh.rules);
  const held = ruleSet(committed.rules);
  const lost = [...held].some((rule) => !have.has(rule));
  const reordered = held.size === have.size && !same(committed.rules, fresh.rules);
  return {
    entry: lost || reordered ? { ...fresh, rules: committed.rules } : fresh,
    fields: lost ? ['rules'] : [],
  };
}

function mergedTraits(committed: Entry, fresh: Entry): Restored {
  const have = new Set(fresh.traits);
  const lost = (committed.traits ?? []).filter((trait) => !have.has(trait));
  return {
    entry: lost.length > 0 ? { ...fresh, traits: [...(fresh.traits ?? []), ...lost] } : fresh,
    fields: lost.length > 0 ? ['traits'] : [],
  };
}

function mergedData(committed: Entry, fresh: Entry): Restored {
  const held = Object.entries(committed.data ?? {});
  const dropped = held.filter(([key, value]) => {
    const kept = key in (fresh.data ?? {});
    return !kept || (isBlank(fresh.data?.[key]) && !isBlank(value));
  });
  return {
    entry: dropped.length > 0 ? { ...fresh, data: { ...fresh.data, ...Object.fromEntries(dropped) } } : fresh,
    fields: dropped.map(([key]) => `data.${key}`),
  };
}

export function restore(committed: Entry, fresh: Entry): Restored {
  const described = same(committed.description, fresh.description)
    ? fresh
    : { ...fresh, description: committed.description };
  const rules = mergedRules(committed, described);
  const traits = mergedTraits(committed, rules.entry);
  const data = mergedData(committed, traits.entry);
  return {
    entry: data.entry,
    fields: [...(described === fresh ? [] : ['description']), ...rules.fields, ...traits.fields, ...data.fields],
  };
}
