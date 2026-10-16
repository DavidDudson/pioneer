import { ContentId, FundamentalRune, ReinforcingGrade, RuneGrade, RuneType, uniqueItems } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * The most property runes a stored line holds. The rules' own cap (`PROPERTY_RUNES_MAX`) binds player lines only, and
 * the inventory checks it there; an imported line may hold more, up to this storage ceiling.
 */
const PROPERTY_RUNES_STORED_MAX = 20;

/**
 * The runes etched onto one inventory item, over those its content comes with. A specific magic item's fundamental
 * runes can be etched higher than it comes with; its property runes are as printed. Any other item has only these.
 */
export const ItemRunesSchema = z.strictObject({
  potency: RuneGrade.optional(),
  striking: RuneGrade.optional(),
  resilient: RuneGrade.optional(),
  reinforcing: ReinforcingGrade.optional(),
  property: z.array(ContentId).max(PROPERTY_RUNES_STORED_MAX).readonly().check(uniqueItems).default([]),
});
export type ItemRunes = z.infer<typeof ItemRunesSchema>;

export const NO_RUNES: ItemRunes = ItemRunesSchema.parse({});

/** A rune on an item: a fundamental rune by what it is, a property rune by its content. */
export const RuneRefSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(RuneType.Fundamental), rune: z.enum(FundamentalRune) }),
  z.strictObject({ type: z.literal(RuneType.Property), rune: ContentId }),
]);
export type RuneRef = z.infer<typeof RuneRefSchema>;

/** A rune to etch: a fundamental rune at a grade it has (a reinforcing rune goes to 6, the rest to 4), or a property rune. */
export const RuneEtchingSchema = z.union([
  z.strictObject({
    type: z.literal(RuneType.Fundamental),
    rune: z.enum([FundamentalRune.Potency, FundamentalRune.Striking, FundamentalRune.Resilient]),
    grade: RuneGrade,
  }),
  z.strictObject({
    type: z.literal(RuneType.Fundamental),
    rune: z.literal(FundamentalRune.Reinforcing),
    grade: ReinforcingGrade,
  }),
  z.strictObject({ type: z.literal(RuneType.Property), rune: ContentId }),
]);
export type RuneEtching = z.infer<typeof RuneEtchingSchema>;

const RUNE_GRADE_MAX = ReinforcingGrade.parse(4);
const REINFORCING_GRADE_MAX = ReinforcingGrade.parse(6);

/** The highest grade of each fundamental rune: 4, but 6 for reinforcing. */
export const FUNDAMENTAL_GRADE_MAX: Readonly<Record<FundamentalRune, ReinforcingGrade>> = {
  [FundamentalRune.Potency]: RUNE_GRADE_MAX,
  [FundamentalRune.Striking]: RUNE_GRADE_MAX,
  [FundamentalRune.Resilient]: RUNE_GRADE_MAX,
  [FundamentalRune.Reinforcing]: REINFORCING_GRADE_MAX,
};
