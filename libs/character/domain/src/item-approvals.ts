import { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { AttachedCampaignId } from './character-packs';
import { InventoryItemId } from './inventory';
import { RuleBreak, RuleCount } from './rule-violations';
import type { RuleViolation } from './rule-violations';

/**
 * A rule-breaking line the campaign's GM approved (ADR-0064), as the sheet needs it to quiet the warning. It covers the
 * line for the rule, at no more than the count approved, so the warning comes back when the line breaks the rule by
 * more. A rune not allowed is approved for that rune.
 */
export const ItemApproval = z.object({
  item: InventoryItemId,
  rule: z.enum(RuleBreak),
  rune: ContentId.optional(),
  value: RuleCount,
});
export type ItemApproval = z.output<typeof ItemApproval>;

/** JSON shape of the approvals a character's campaign gave it, and which campaign that is; none outside a campaign. */
export const CharacterItemApprovals = z.object({
  /** The campaign the character is in, which the sheet links its key items back to. */
  campaign: AttachedCampaignId.optional(),
  approvals: z.array(ItemApproval).readonly(),
});
export type CharacterItemApprovals = z.output<typeof CharacterItemApprovals>;

/** How far a violation breaks its rule: the count the item took the total to, or 1 for a rune not allowed. */
const ONE_RUNE = RuleCount.parse(1);

function brokenBy(violation: RuleViolation): RuleCount {
  return violation.rule === RuleBreak.RuneNotAllowed ? ONE_RUNE : violation.actual;
}

/** Whether `approval` covers `violation`: the same item and rule (and rune), at no more than the count approved. */
export function covers(approval: ItemApproval, violation: RuleViolation): boolean {
  return (
    approval.item === violation.item &&
    approval.rule === violation.rule &&
    approval.rune === (violation.rule === RuleBreak.RuneNotAllowed ? violation.rune : undefined) &&
    brokenBy(violation) <= approval.value
  );
}

/** The violations split by whether an approval covers them. */
export interface ApprovedViolations {
  readonly open: readonly RuleViolation[];
  readonly approved: readonly RuleViolation[];
}

/** `violations` split into those no approval covers, which still warn, and those one does (ADR-0064). */
export function partitionApproved(
  violations: readonly RuleViolation[],
  approvals: readonly ItemApproval[],
): ApprovedViolations {
  const approved = violations.filter((violation) => approvals.some((approval) => covers(approval, violation)));
  return { open: violations.filter((violation) => !approved.includes(violation)), approved };
}

/** How far `violation` breaks its rule, for the count an approval records. */
export function violationCount(violation: RuleViolation): RuleCount {
  return brokenBy(violation);
}
