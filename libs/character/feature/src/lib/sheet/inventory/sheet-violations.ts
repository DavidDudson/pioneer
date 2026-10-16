import { RuleBreak } from '@pioneer/character/domain';
import type { InventoryItemId, RuleViolation, RuneContent } from '@pioneer/character/domain';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** Message keys for the rules an item breaks, spelled out so the key check sees them. */
export const ViolationMessage = {
  Invested: 'character.sheet.inventory.break.invested',
  Hands: 'character.sheet.inventory.break.hands',
  PropertyRunes: 'character.sheet.inventory.break.propertyRunes',
  RuneNotAllowed: 'character.sheet.inventory.break.runeNotAllowed',
  UnknownRune: 'character.sheet.inventory.break.unknownRune',
} as const;

const COUNT_MESSAGES = {
  [RuleBreak.Invested]: ViolationMessage.Invested,
  [RuleBreak.Hands]: ViolationMessage.Hands,
  [RuleBreak.PropertyRunes]: ViolationMessage.PropertyRunes,
} as const;

/** Why an item breaks a rule, as the sheet words it: the limit and the count it reached, or the rune it can't hold. */
function violationReason(violation: RuleViolation, runes: RuneContent): MessageDescriptor {
  if (violation.rule === RuleBreak.RuneNotAllowed) {
    const name = runes.get(violation.rune)?.name;
    return name === undefined
      ? message(ViolationMessage.UnknownRune)
      : message(ViolationMessage.RuneNotAllowed, { rune: name });
  }
  return message(COUNT_MESSAGES[violation.rule], { limit: violation.limit, actual: violation.actual });
}

/** The reasons each item breaks a rule, by the item's id; an item that breaks none has no entry. */
export function reasonsByItem(
  violations: readonly RuleViolation[],
  runes: RuneContent,
): ReadonlyMap<InventoryItemId, readonly MessageDescriptor[]> {
  const reasons = new Map<InventoryItemId, MessageDescriptor[]>();
  for (const violation of violations) {
    reasons.set(violation.item, [...(reasons.get(violation.item) ?? []), violationReason(violation, runes)]);
  }
  return reasons;
}

/** How many items break at least one rule. */
export function ruleBreakingCount(violations: readonly RuleViolation[]): number {
  return new Set(violations.map((each) => each.item)).size;
}
