import { ContentId } from '@pioneer/rules/sdk';
import { Uuid } from '@pioneer/shared/kernel';
import type { Temporal, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttachedCampaignId } from './character-packs';
import { InventoryItemId } from './inventory';
import { RuleBreak, RuleCount } from './rule-violations';
import type { RuleViolation } from './rule-violations';

/** Row id of one rule-breaking line an owner acknowledged; the audit log keys every row by an `id`. */
export const ItemAcknowledgementId = Uuid.brand<'ItemAcknowledgementId'>();
export type ItemAcknowledgementId = z.infer<typeof ItemAcknowledgementId>;

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
  /** Set when the owner acknowledged the line (a character outside a campaign), which the owner can take back. */
  acknowledgement: ItemAcknowledgementId.optional(),
});
export type ItemApproval = z.output<typeof ItemApproval>;

/** JSON shape of the approvals a character's campaign gave it, and which campaign that is; none outside a campaign. */
export const CharacterItemApprovals = z.object({
  /** The campaign the character is in, which the sheet links its key items back to. */
  campaign: AttachedCampaignId.optional(),
  /** Whether the owner may acknowledge a line: only outside a campaign, which has no GM to approve it. */
  acknowledgeable: z.boolean().optional(),
  /** The campaign's approvals, or outside a campaign the owner's own acknowledgements. */
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

/** A line the owner of a character outside a campaign acknowledged, and the count it was acknowledged at. */
export interface ItemAcknowledgement {
  readonly id: ItemAcknowledgementId;
  readonly item: InventoryItemId;
  readonly rule: RuleBreak;
  readonly rune: ContentId | undefined;
  /** The count acknowledged: the warning comes back once the line breaks the rule by more. */
  readonly value: RuleCount;
  /** The owner who acknowledged it; absent once their account is deleted. */
  readonly acknowledgedBy: UserId | undefined;
  readonly acknowledgedAt: Temporal.Instant;
}

/** The line an owner acknowledges: it must break the rule now, and is acknowledged at the count it breaks it by. */
export const AcknowledgeItemBody = z.object({
  item: InventoryItemId,
  rule: z.enum(RuleBreak),
  /** The rune a rune-not-allowed line is about; absent for every other rule. */
  rune: ContentId.optional(),
});
export type AcknowledgeItemBody = z.output<typeof AcknowledgeItemBody>;
