import { ContentId, FundamentalRune, PropertyRunes, ReinforcingGrade, RuneGrade, RuneType } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * The runes etched onto one inventory item, over those its content comes with. A specific magic item's fundamental
 * runes can be etched higher than it comes with; its property runes are as printed. Any other item has only these.
 */
export const ItemRunesSchema = z.strictObject({
  potency: RuneGrade.optional(),
  striking: RuneGrade.optional(),
  resilient: RuneGrade.optional(),
  reinforcing: ReinforcingGrade.optional(),
  property: PropertyRunes.default([]),
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
