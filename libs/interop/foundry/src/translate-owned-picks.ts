import { ContentKind, RuleElementKey } from '@pioneer/rules/sdk';
import type { ChoiceSetElement, RuleElement } from '@pioneer/rules/sdk';

import { kebab } from './foundry-flags';

/**
 * A `ChoiceSet` over the items the character owns (`ownedItems: true`) and the rules that read its pick, in Pioneer's
 * spelling (ADR-0075). The query becomes `{ ownedKinds, filter }`; a reader's selector `{pick}-damage` becomes
 * `picked:<flag>-damage`, and an `ItemAlteration` aimed at the pick (`itemId`, or `item:id:{pick}` in its predicate)
 * becomes `item:picked:<flag>`; so does `item:id:{pick}` or `item:slug:{pick}` in the `definition` of an
 * `AdjustStrike`, the weapons it reaches. Only the picks of a `ChoiceSet` over owned items are read this way, and a
 * rule that names `picked:<flag>` without such a `ChoiceSet` beside it is kept for the backlog (`danglingPicks`).
 */

/** The kinds of item Foundry's `types` names. */
const OWNED_KINDS: ReadonlyMap<string, ContentKind> = new Map([
  ['armor', ContentKind.Armor],
  ['backpack', ContentKind.Equipment],
  ['consumable', ContentKind.Consumable],
  ['equipment', ContentKind.Equipment],
  ['shield', ContentKind.Shield],
  ['treasure', ContentKind.Treasure],
  ['weapon', ContentKind.Weapon],
]);

/** The fields of a query of owned items. */
const OWNED_FIELDS: ReadonlySet<string> = new Set(['ownedItems', 'types', 'predicate']);

/** A read of a pick: `{item|flags.system.rulesSelections.<flag>}`, or `@item.flags.pf2e.rulesSelections.<flag>`. */
const PICK_READ =
  /^(?:\{item\|flags\.(?:system|pf2e)\.rulesSelections\.(?<braced>[A-Za-z0-9]+)\}|@item\.flags\.(?:system|pf2e)\.rulesSelections\.(?<at>[A-Za-z0-9]+))$/u;
const SELECTOR_READ = /^(?<read>.+)-(?<roll>attack|damage)$/u;
/** The predicate statements that name an item by what a pick stores: its id, or its slug (both are the slug in Pioneer). */
const ITEM_NAMES = ['item:id:', 'item:slug:'] as const;

function isFields(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The Foundry flag a read of a pick names; none for any other text. */
function flagRead(text: unknown): string | undefined {
  const found = typeof text === 'string' ? PICK_READ.exec(text) : undefined;
  return found?.groups?.['braced'] ?? found?.groups?.['at'];
}

/** A query of owned items as Pioneer's, with its predicate as the filter; any other choices as they are. */
export function ownedQueryOf(choices: object, filterOf: (statement: unknown) => unknown): unknown {
  const fields = Object.keys(choices);
  if (!('ownedItems' in choices) || choices.ownedItems !== true || !fields.every((field) => OWNED_FIELDS.has(field))) {
    return choices;
  }
  const types = 'types' in choices && Array.isArray(choices.types) ? (choices.types as readonly unknown[]) : [];
  const kinds = types.map((type) => (typeof type === 'string' ? OWNED_KINDS.get(type) : undefined));
  const filter = 'predicate' in choices && Array.isArray(choices.predicate) ? choices.predicate : [];
  if (kinds.length === 0 || kinds.some((kind) => kind === undefined)) {
    return choices;
  }
  return { ownedKinds: kinds, filter: filter.map((statement: unknown) => filterOf(statement)) };
}

/** The Foundry flags of the `ChoiceSet`s among `raws` that pick an owned item. */
export function ownedFlagsOf(raws: readonly unknown[]): ReadonlySet<string> {
  return new Set(
    raws.flatMap((raw): string[] => {
      const isOwned =
        isFields(raw) &&
        raw['key'] === RuleElementKey.ChoiceSet &&
        isFields(raw['choices']) &&
        raw['choices']['ownedItems'] === true;
      return isOwned && typeof raw['flag'] === 'string' ? [raw['flag']] : [];
    }),
  );
}

/** A selector `{pick}-damage` as `picked:<flag>-damage`, when the pick is one of `flags`; any other text as it is. */
function pickedSelector(selector: unknown, flags: ReadonlySet<string>): unknown {
  const split = typeof selector === 'string' ? SELECTOR_READ.exec(selector) : undefined;
  const flag = flagRead(split?.groups?.['read']);
  return flag !== undefined && flags.has(flag) ? `picked:${kebab(flag)}-${split?.groups?.['roll']}` : selector;
}

function pickedSelectors(value: unknown, flags: ReadonlySet<string>): unknown {
  return Array.isArray(value)
    ? value.map((each: unknown) => pickedSelector(each, flags))
    : pickedSelector(value, flags);
}

/** `item:id:{pick}` or `item:slug:{pick}` as `item:picked:<flag>`, when the pick is one of `flags`. */
function pickedItemStatement(statement: unknown, flags: ReadonlySet<string>): unknown {
  if (typeof statement !== 'string') {
    return statement;
  }
  const prefix = ITEM_NAMES.find((name) => statement.startsWith(name));
  const flag = prefix === undefined ? undefined : flagRead(statement.slice(prefix.length));
  return flag !== undefined && flags.has(flag) ? `item:picked:${kebab(flag)}` : statement;
}

/** An `ItemAlteration` aimed at a pick (`itemId`), or whose predicate names it, as `item:picked:<flag>` in its predicate. */
function alterationOf(raw: Record<string, unknown>, flags: ReadonlySet<string>): Record<string, unknown> {
  const statements: readonly unknown[] = Array.isArray(raw['predicate']) ? raw['predicate'] : [];
  const flag = flagRead(raw['itemId']);
  const aimed = flag !== undefined && flags.has(flag) ? [`item:picked:${kebab(flag)}`] : [];
  const rest = Object.fromEntries(Object.entries(raw).filter(([field]) => field !== 'itemId'));
  const predicate = [...aimed, ...statements.map((statement) => pickedItemStatement(statement, flags))];
  const kept = aimed.length > 0 ? rest : raw;
  return predicate.length > 0 ? { ...kept, predicate } : kept;
}

/**
 * `raw` with its reads of the picks of `flags` (the `ChoiceSet`s over owned items beside it) as Pioneer spells them:
 * its selectors as `picked:<flag>-attack` and `-damage`, and an `ItemAlteration`'s target as `item:picked:<flag>`.
 */
export function withOwnedPicks(raw: unknown, flags: ReadonlySet<string>): unknown {
  if (flags.size === 0 || !isFields(raw)) {
    return raw;
  }
  const selected = Object.fromEntries(
    Object.entries(raw).map(([field, value]) => [
      field,
      field === 'selector' || field === 'selectors' ? pickedSelectors(value, flags) : value,
    ]),
  );
  if (raw['key'] === RuleElementKey.AdjustStrike && Array.isArray(selected['definition'])) {
    return {
      ...selected,
      definition: selected['definition'].map((statement: unknown) => pickedItemStatement(statement, flags)),
    };
  }
  return raw['key'] === RuleElementKey.ItemAlteration ? alterationOf(selected, flags) : selected;
}

const PICKED = /picked:(?<flag>[a-z0-9-]+?)(?:-(?:attack|damage))?"/gu;

/** The flags an element names as `picked:<flag>`: in a selector, or `item:picked:<flag>` in a predicate. */
export function pickedFlagsIn(element: unknown): readonly string[] {
  return [...JSON.stringify(element).matchAll(PICKED)].flatMap((found) => found.groups?.['flag'] ?? []);
}

/**
 * Whether `element` names `picked:<flag>` for a flag no `ChoiceSet` among `declared` carries: a rule that would never
 * apply, as a typo or a `ChoiceSet` left in the backlog would leave it. Such a rule stays in the backlog too.
 */
export function danglingPick(element: unknown, declared: ReadonlySet<string>): boolean {
  return pickedFlagsIn(element).some((flag) => !declared.has(flag));
}

/** Whether `element` is a `ChoiceSet` over owned items. */
function isOwnedChoiceSet(element: RuleElement | undefined): element is ChoiceSetElement {
  return (
    element?.key === RuleElementKey.ChoiceSet && !Array.isArray(element.choices) && 'ownedKinds' in element.choices
  );
}

/**
 * The flags of the `ChoiceSet`s over owned items that no other `ChoiceSet` of the entry shares. Foundry names a flag
 * by the item when it has none, so a second `ChoiceSet` can land on the same flag; a read of `picked:<flag>` would not
 * say which pick it meant, so neither the owned `ChoiceSet` nor its readers are translated.
 */
export function ownedFlagsOnce(elements: readonly (RuleElement | undefined)[]): ReadonlySet<string> {
  const sets = elements.filter((element): element is ChoiceSetElement => element?.key === RuleElementKey.ChoiceSet);
  const counts = Map.groupBy(sets, (set) => String(set.flag));
  return new Set(
    sets
      .filter((set) => isOwnedChoiceSet(set) && counts.get(String(set.flag))?.length === 1)
      .map((set) => String(set.flag)),
  );
}

/** Whether `element` is a `ChoiceSet` over owned items whose flag is not in `declared`: shared with another `ChoiceSet`. */
export function ambiguousOwned(element: RuleElement, declared: ReadonlySet<string>): boolean {
  return isOwnedChoiceSet(element) && !declared.has(String(element.flag));
}
