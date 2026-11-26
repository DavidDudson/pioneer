import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { Modifier, RuleElementKey } from '@pioneer/rules/sdk';
import type { ActionCost, ContentId, Frequency, RuleElement, TriggerEvent, TriggerEventType } from '@pioneer/rules/sdk';

/**
 * An action or effect that fires on an event (play-and-campaigns.md, "Triggered abilities"), as the engine reads it:
 * what it costs, what it does and whether its content opts out of applying itself. The caller builds these from the
 * character's granted actions and effects.
 */
export interface TriggerableAbility {
  readonly id: ContentId;
  readonly triggerEvent: TriggerEvent | undefined;
  /** `false` when the content always wants a prompt, even for a free and beneficial ability. */
  readonly autoApply?: false | undefined;
  /** The actions it takes; none for a passive ability or an effect. */
  readonly cost?: ActionCost | undefined;
  /** How often it can be used; none when unlimited. */
  readonly frequency?: Frequency | undefined;
  /** Whether it takes a Focus Point, a slot, a charge or another counted resource. */
  readonly spendsResource?: boolean | undefined;
  /** Whether using it asks for a choice or makes a roll. */
  readonly needsChoice?: boolean | undefined;
  /** What it does, as rule elements. */
  readonly rules: readonly RuleElement[];
}

/**
 * The abilities that fire on `event`: those whose `triggerEvent` names it and whose predicate holds for `facts`, the
 * roll options of the event (the spell cast or the weapon used are the `item`). A predicate the facts leave unknown
 * does not match, so an ability never fires on a guess.
 */
export function triggeredAbilities<Ability extends TriggerableAbility>(
  event: TriggerEventType,
  facts: PredicateFacts,
  abilities: readonly Ability[],
): readonly Ability[] {
  return abilities.filter(({ triggerEvent }) => {
    if (triggerEvent?.event !== event) {
      return false;
    }

    return triggerEvent.predicate === undefined || evaluatePredicate(triggerEvent.predicate, facts) === Truth.True;
  });
}

/** Whether a rule element only helps the character: temporary Hit Points, fast healing, or a bonus. */
function isBeneficial(rule: RuleElement): boolean {
  if (rule.key === RuleElementKey.TempHP || rule.key === RuleElementKey.FastHealing) {
    return true;
  }

  if (rule.key === RuleElementKey.FlatModifier) {
    const value = Modifier.safeParse(rule.value);

    return value.success && value.data > 0;
  }

  return false;
}

/**
 * Whether an ability applies by itself when its event fires: it costs nothing (no action, reaction, frequency or
 * resource), needs no choice or roll, and every rule element only helps. An ability with no rule elements does
 * nothing to apply, and content can opt out with `autoApply: false`.
 */
export function appliesAutomatically(ability: TriggerableAbility): boolean {
  const { autoApply, cost, frequency, spendsResource, needsChoice, rules } = ability;

  const free = cost === undefined && frequency === undefined && spendsResource !== true && needsChoice !== true;

  return autoApply !== false && free && rules.length > 0 && rules.every((rule) => isBeneficial(rule));
}
