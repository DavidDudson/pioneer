import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

/** A spell's rank, 1 to 10. A cantrip is rank 1 with the `cantrip` trait, as in Foundry pf2e. */
export const SPELL_RANK_MAX = 10;
export const SpellRank = Pg.smallint().min(1).max(SPELL_RANK_MAX).brand<'SpellRank'>();
export type SpellRank = z.infer<typeof SpellRank>;
