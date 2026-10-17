import { Pg, Uuid } from '@pioneer/shared/kernel';
import type { Temporal, UserId, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CampaignItemApprovalId, CharacterId } from './campaign-fields';

/**
 * A rule an inventory line can break and a GM can approve. The values name the character context's `RuleBreak`
 * (ADR-0064), which the campaign context may not import, so the composition root's adapter hands them over by name and
 * a test in `apps/api` holds the two together.
 */
export const ItemRule = {
  Invested: 'invested',
  Hands: 'hands',
  PropertyRunes: 'propertyRunes',
  RuneNotAllowed: 'runeNotAllowed',
} as const;
export type ItemRule = ValueOf<typeof ItemRule>;
export const ItemRuleSchema = z.enum(ItemRule);

/** An inventory line of a character in the campaign; the campaign context only names it. */
export const ReviewedItemId = Uuid.brand<'InventoryItemId'>();
export type ReviewedItemId = z.infer<typeof ReviewedItemId>;

/** A property rune, by its content id. */
export const ReviewedRuneId = Uuid.brand<'ContentId'>();
export type ReviewedRuneId = z.infer<typeof ReviewedRuneId>;

/** A name the campaign shows for a character, an item or a rune. */
export const ReviewedName = z.string().min(1).brand<'ReviewedName'>();
export type ReviewedName = z.infer<typeof ReviewedName>;

/** The count a rule is broken by: items invested, hands held, property runes etched. A rune not allowed counts as 1. */
export const ReviewedCount = Pg.smallint().nonnegative().brand<'ReviewedCount'>();
export type ReviewedCount = z.infer<typeof ReviewedCount>;

/**
 * The line a rule is broken on: a character's item, the rule, and for a rune not allowed the rune. `count` is how far
 * the rule is broken: the count the item took the total to, or 1 for a rune.
 */
export const ItemBreak = z.object({
  character: CharacterId,
  item: ReviewedItemId,
  rule: ItemRuleSchema,
  rune: ReviewedRuneId.optional(),
  count: ReviewedCount,
});
export type ItemBreak = z.output<typeof ItemBreak>;

/** A broken rule with the names the screen shows, as the character context reads it off a character. */
export const FlaggedItem = ItemBreak.extend({
  characterName: ReviewedName,
  itemName: ReviewedName,
  runeName: ReviewedName.optional(),
});
export type FlaggedItem = z.output<typeof FlaggedItem>;

/** A flagged item the GM approved, and the count it was approved at. */
export interface CampaignItemApproval {
  readonly id: CampaignItemApprovalId;
  readonly character: CharacterId;
  readonly item: ReviewedItemId;
  readonly rule: ItemRule;
  readonly rune: ReviewedRuneId | undefined;
  /** The count approved: a warning for the same item and rule comes back once the count grows past it. */
  readonly value: ReviewedCount;
  /** The GM who approved it; absent once their account is deleted. */
  readonly approvedBy: UserId | undefined;
  readonly approvedAt: Temporal.Instant;
}

/** The line a rule is broken on: the same character, item, rule and, for a rune not allowed, rune. */
export function sameLine(left: Omit<ItemBreak, 'count'>, right: Omit<ItemBreak, 'count'>): boolean {
  return (
    left.character === right.character &&
    left.item === right.item &&
    left.rule === right.rule &&
    left.rune === right.rune
  );
}

/** Whether `approval` silences `flagged`: the same line and rule (and rune), at no more than the count approved. */
export function approves(approval: CampaignItemApproval, flagged: ItemBreak): boolean {
  return sameLine(approval, flagged) && flagged.count <= approval.value;
}

/** A flagged item the GM has approved. */
export const ApprovedItem = FlaggedItem.extend({
  approval: CampaignItemApprovalId,
  /** The count it was approved at. */
  approvedCount: ReviewedCount,
});
export type ApprovedItem = z.output<typeof ApprovedItem>;

/**
 * JSON shape of a campaign's rule-breaking items. Every member sees the approved ones; only the GM sees the ones that
 * need review.
 */
export const CampaignItemReview = z.object({
  /** Whether the viewer may approve or revoke: the GM. */
  manageable: z.boolean(),
  /** Flagged items no approval covers, across the party. Empty for a player. */
  needsReview: z.array(FlaggedItem).readonly(),
  /** Flagged items an approval covers. */
  approved: z.array(ApprovedItem).readonly(),
});
export type CampaignItemReview = z.output<typeof CampaignItemReview>;

/** The line and rule the GM approves. The count is the one the item is flagged at when the GM approves. */
export const ApproveItemBody = ItemBreak.omit({ count: true });
export type ApproveItemBody = z.output<typeof ApproveItemBody>;
