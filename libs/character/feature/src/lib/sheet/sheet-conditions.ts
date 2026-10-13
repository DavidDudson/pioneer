import type { ActiveCondition, ConditionInstanceId } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ConditionValue, ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';

/** Whether two reads of the conditions hold the same ones, so a play edit that leaves them alone derives nothing again. */
export function sameConditions(
  left: readonly ActiveCondition[] | undefined,
  right: readonly ActiveCondition[] | undefined,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The registry kind the conditions picker and the header read. */
export const CONDITION_CONTENT_KINDS: readonly ContentKind[] = [ContentKind.Condition];

/** The highest value the sheet raises a valued condition to; the content sets no limit of its own. */
export const CONDITION_VALUE_MAX = 9;

/** A condition the content has, as the add picker offers it. */
export interface ConditionOption {
  readonly id: ContentId;
  readonly name: string;
  readonly valued: boolean;
}

/** A condition another one on the character brings with it, shown under it and not removable on its own. */
interface ImpliedView {
  readonly id: ContentId;
  readonly name: string;
}

/** One condition active on the character, as the header shows it. */
export interface ConditionView {
  readonly id: ConditionInstanceId;
  /** The condition's content entry, which the header's preview opens. */
  readonly condition: ContentId;
  readonly name: string;
  readonly valued: boolean;
  readonly value: ConditionValue | undefined;
  readonly implied: readonly ImpliedView[];
  /** The name of the active condition that overrides this one, if one does: it is suppressed while that lasts. */
  readonly overriddenBy: string | undefined;
}

/** The conditions of the registry's packs by id; the last pack's entry wins, as in the registry. */
function conditionEntries(registry: ContentRegistry): ReadonlyMap<ContentId, ConditionEntry> {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(entries.flatMap((entry) => (isCondition(entry) ? [[entry.id, entry] as const] : [])));
}

type ConditionEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Condition }>;

function isCondition(entry: ContentEntry): entry is ConditionEntry {
  return entry.kind === ContentKind.Condition;
}

/** Every condition the content has, by name, for the add picker. */
export function conditionOptions(registry: ContentRegistry): readonly ConditionOption[] {
  return [...conditionEntries(registry).values()]
    .map((entry) => ({ id: entry.id, name: entry.name, valued: entry.data.valued }))
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

/**
 * Each condition active on the character with its value, the conditions it implies and, when another active condition
 * overrides it, which. A condition the content lacks is left out, as nothing can be said of it.
 */
export function conditionViews(
  registry: ContentRegistry,
  active: readonly ActiveCondition[],
): readonly ConditionView[] {
  const entries = conditionEntries(registry);
  const overriders = active.flatMap(({ condition }) => {
    const entry = entries.get(condition);
    return entry === undefined ? [] : entry.data.overrides.map((overridden) => ({ overridden, by: entry.name }));
  });
  return active.flatMap((each): ConditionView[] => {
    const entry = entries.get(each.condition);
    if (entry === undefined) {
      return [];
    }
    const implied = entry.data.implies.flatMap((id): ImpliedView[] => {
      const named = entries.get(id);
      return named === undefined ? [] : [{ id, name: named.name }];
    });
    return [
      {
        id: each.id,
        condition: each.condition,
        name: entry.name,
        valued: entry.data.valued,
        value: each.value,
        implied,
        overriddenBy: overriders.find(({ overridden }) => overridden === each.condition)?.by,
      },
    ];
  });
}
