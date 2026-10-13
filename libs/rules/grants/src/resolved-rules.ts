import { RuleElementKey, RuleIndex, Selector } from '@pioneer/rules/sdk';
import type { ChoiceSelector, Origin, RuleElement } from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';
import type { GrantResolution } from './resolve-grants';

/** One rule element of an entry in the effective set, its choice-driven selector resolved: `entry.rules[rule]`. */
export interface ResolvedRule {
  readonly entry: GrantEntry;
  readonly origin: Origin;
  readonly rule: RuleIndex;
  readonly element: RuleElement;
}

/** What a `ChoiceSet` stored, by the entry holding it and the name it stored under. */
function pickKey(entry: string, flag: string): string {
  return `${entry}#${flag}`;
}

/**
 * The selector a choice-driven selector reaches with the pick, `prefix:pick`; undefined while the pick is to make, or
 * when the pick makes no selector.
 */
function selectorOf(
  { choice, prefix }: ChoiceSelector,
  entry: string,
  picks: ReadonlyMap<string, string>,
): Selector | undefined {
  const pick = picks.get(pickKey(entry, choice));
  const selector = pick === undefined ? undefined : Selector.safeParse(`${prefix}:${pick}`);
  return selector?.success === true ? selector.data : undefined;
}

/**
 * Each rule element of each entry in the effective set, with the entry's origin and its place in the entry's rules. A
 * `Proficiency` whose selector follows a `ChoiceSet` (ADR-0053) takes the selector the pick makes; one whose pick is
 * still to make, or names no selector, raises nothing and is left out.
 */
export function resolvedRules(resolution: GrantResolution): readonly ResolvedRule[] {
  const picks = new Map(resolution.answered.map(({ origin, flag, pick }) => [pickKey(origin.entry, flag), pick]));
  return resolution.items.flatMap(({ entry, origin }) =>
    entry.rules.flatMap((element, index): ResolvedRule[] => {
      const rule = RuleIndex.parse(index);
      if (element.key !== RuleElementKey.Proficiency || typeof element.selector === 'string') {
        return [{ entry, origin, rule, element }];
      }
      const selector = selectorOf(element.selector, entry.id, picks);
      return selector === undefined ? [] : [{ entry, origin, rule, element: { ...element, selector } }];
    }),
  );
}
