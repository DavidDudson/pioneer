import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { RulesMessage } from './messages';
import { SpellRank } from './spell-rank';
import { uniqueItems } from './unique-items';

/** The rank a staff lists its cantrips under: they cost no charges, and cast at the holder's cantrip rank. */
export const STAFF_CANTRIP = 'cantrip';

/** A rank a staff lists spells under: "Cantrip", "1st", "2nd". */
export const StaffRank = z.union([z.literal(STAFF_CANTRIP), SpellRank]);
export type StaffRank = z.infer<typeof StaffRank>;

const STAFF_RANKS_MAX = 11;
const STAFF_SPELLS_MAX = 16;

/** The spells a staff lists under one rank. */
const StaffRankSpells = z.strictObject({
  rank: StaffRank,
  spells: z.array(ContentId).min(1).max(STAFF_SPELLS_MAX).readonly().check(uniqueItems),
});
export type StaffRankSpells = z.infer<typeof StaffRankSpells>;

/**
 * A staff's spells by rank, as its entry lists them (play-and-campaigns.md, "Staves and charged items"): each spell
 * costs charges equal to the rank it is listed under, and a cantrip costs none. The cost is read from the rank, not
 * stored beside it. A rank is listed once.
 */
export const StaffSpells = z
  .array(StaffRankSpells)
  .min(1)
  .max(STAFF_RANKS_MAX)
  .readonly()
  .check((context) => {
    const seen = new Set<StaffRank>();
    for (const [index, { rank }] of context.value.entries()) {
      if (seen.has(rank)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: [index, 'rank'],
          ...issueParams(message(RulesMessage.ListDuplicate, { value: rank })),
        });
      }
      seen.add(rank);
    }
  });
export type StaffSpells = z.infer<typeof StaffSpells>;

/** How many charges a cast from a staff spends. */
export const Charges = Pg.smallint().nonnegative().brand<'Charges'>();
export type Charges = z.infer<typeof Charges>;

const NO_CHARGES = Charges.parse(0);

/** What casting a spell listed under `rank` costs: the rank in charges, nothing for a cantrip. */
export function staffCharges(rank: StaffRank): Charges {
  return rank === STAFF_CANTRIP ? NO_CHARGES : Charges.parse(rank);
}
