import { RuleElementKey, RulePriority } from '@pioneer/rules/sdk';
import type {
  AdjustMode,
  AdjustModifierElement,
  ContentText,
  FlatModifierElement,
  Level,
  ModifierTarget,
  ModifierValue,
  Predicate,
  RuleSlug,
  RuleValue,
} from '@pioneer/rules/sdk';

import type { Modifier, ModifierLabel } from './breakdown';
import { ruleIdOf } from './rule-in-play';
import type { RuleId, RuleInPlay } from './rule-in-play';

/** A modifier with what its value needs: the value as written and the level of the item it is on. */
export interface ModifierSource {
  readonly modifier: Modifier;
  readonly value: ModifierValue;
  readonly itemLevel: Level | undefined;
  /** The authored wording of when it applies, for a conditional line. */
  readonly summary: ContentText | undefined;
}

/** What an `AdjustModifier` does to each modifier it finds. */
type AdjustmentChange =
  | { readonly suppress: true }
  | { readonly suppress: false; readonly mode: AdjustMode; readonly value: RuleValue };

/** An `AdjustModifier` in play. */
export interface Adjustment {
  readonly id: RuleId;
  readonly targets: readonly ModifierTarget[];
  /** Only modifiers with this slug; all of them on the statistic when undefined. */
  readonly slug: RuleSlug | undefined;
  readonly predicate: Predicate | undefined;
  readonly priority: RulePriority;
  readonly change: AdjustmentChange;
  readonly itemLevel: Level | undefined;
}

/** The rule elements in play that bear on statistics' modifiers. */
export interface ModifierRules {
  readonly modifiers: readonly ModifierSource[];
  readonly adjustments: readonly Adjustment[];
}

/** Foundry's default rule element priority, for an element that sets none. */
const DEFAULT_PRIORITY = RulePriority.parse(100);

function labelOf(rule: RuleInPlay): ModifierLabel {
  const text = rule.element.display?.label;
  return text === undefined ? { entry: rule.origin.entry } : { text };
}

function modifierSource(rule: RuleInPlay, element: FlatModifierElement): ModifierSource {
  return {
    modifier: {
      id: ruleIdOf(rule),
      slug: element.slug,
      label: labelOf(rule),
      type: element.type,
      targets: element.selectors,
      predicate: element.predicate,
      origin: rule.origin,
    },
    value: element.value,
    itemLevel: rule.itemLevel,
    summary: element.display?.summary,
  };
}

function changeOf(element: AdjustModifierElement): AdjustmentChange {
  const { mode, value } = element;
  return mode === undefined || value === undefined ? { suppress: true } : { suppress: false, mode, value };
}

function adjustment(rule: RuleInPlay, element: AdjustModifierElement): Adjustment {
  return {
    id: ruleIdOf(rule),
    targets: element.selectors,
    slug: element.slug,
    predicate: element.predicate,
    priority: element.priority ?? DEFAULT_PRIORITY,
    change: changeOf(element),
    itemLevel: rule.itemLevel,
  };
}

/** The modifiers (`FlatModifier`) and adjustments (`AdjustModifier`) among the rules; other elements are ignored. */
export function modifierRules(rules: readonly RuleInPlay[]): ModifierRules {
  const modifiers: ModifierSource[] = [];
  const adjustments: Adjustment[] = [];
  for (const rule of rules) {
    const { element } = rule;
    if (element.key === RuleElementKey.FlatModifier) {
      modifiers.push(modifierSource(rule, element));
    } else if (element.key === RuleElementKey.AdjustModifier) {
      adjustments.push(adjustment(rule, element));
    }
  }
  return { modifiers, adjustments };
}
