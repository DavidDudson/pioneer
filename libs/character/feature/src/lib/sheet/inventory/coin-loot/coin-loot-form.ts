import { CoinAmount, CoinGrantReason, coinsValue, LedgerNote, LedgerReason } from '@pioneer/character/domain';
import * as z from 'zod';

const CoinLootFields = z.object({
  pp: CoinAmount,
  gp: CoinAmount,
  sp: CoinAmount,
  cp: CoinAmount,
  reason: z.string(),
  note: z.union([LedgerNote, z.literal('')]),
});

/** Whether the coins held are worth anything: a gift or a take of nothing is no edit. */
function holdsCoins(form: z.infer<typeof CoinLootFields>): boolean {
  return coinsValue(form) > 0;
}

/** What the form checks while it is filled in: the reason is a string here, like the model's. */
export const CoinLootDraft = CoinLootFields.refine((form) => CoinGrantReason.safeParse(form.reason).success).refine(
  holdsCoins,
);

/** What it submits: the same, with the reason as a gift or loot. */
export const CoinLootForm = CoinLootFields.extend({ reason: CoinGrantReason }).refine(holdsCoins);

/** The form's model. Signal forms need concrete field types, so no note is ''. */
export interface CoinLootModel {
  readonly pp: number;
  readonly gp: number;
  readonly sp: number;
  readonly cp: number;
  readonly reason: string;
  readonly note: string;
}

export const EMPTY_COIN_LOOT: CoinLootModel = { pp: 0, gp: 0, sp: 0, cp: 0, reason: LedgerReason.Loot, note: '' };
