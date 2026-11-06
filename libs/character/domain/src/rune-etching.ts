import { ContentId, FundamentalRune, ReinforcingGrade, RuneGrade, RuneType } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * The most property runes a stored line holds. The rules' own cap (`PROPERTY_RUNES_MAX`) binds player lines only, and
 * the inventory checks it there; an imported line may hold more, up to this storage ceiling.
 */
const PROPERTY_RUNES_STORED_MAX = 20;

const RUNE_CHOICE_MAX_LENGTH = 64;

/** What the crafter chose when etching a rune made for one thing: an energy's damage type, a creature type. */
const RuneChoice = z.string().min(1).max(RUNE_CHOICE_MAX_LENGTH).brand<'RuneChoice'>();
export type RuneChoice = z.infer<typeof RuneChoice>;

/** A property rune etched onto an item: the rune, and the crafter's choice when the rune asks for one. */
const EtchedRuneSchema = z.strictObject({ rune: ContentId, choice: RuneChoice.optional() });
export type EtchedRune = z.infer<typeof EtchedRuneSchema>;

/** One etched rune is the same as another when both name the same rune and the same choice. */
export function sameEtchedRune(left: EtchedRune, right: EtchedRune): boolean {
  return left.rune === right.rune && left.choice === right.choice;
}

/** A line holds each rune once per choice: two Energy Resistant runes may be etched for different energies. */
function uniqueEtchedRunes(context: z.core.ParsePayload<readonly EtchedRune[]>): void {
  for (const [index, each] of context.value.entries()) {
    if (context.value.findIndex((other) => sameEtchedRune(each, other)) !== index) {
      context.issues.push({ code: 'custom', input: context.value, path: [index], message: 'Duplicate rune' });
    }
  }
}

/**
 * The runes etched onto one inventory item, over those its content comes with. A specific magic item's fundamental
 * runes can be etched higher than it comes with; its property runes are as printed. Any other item has only these.
 */
export const ItemRunesSchema = z.strictObject({
  potency: RuneGrade.optional(),
  striking: RuneGrade.optional(),
  resilient: RuneGrade.optional(),
  reinforcing: ReinforcingGrade.optional(),
  property: z.array(EtchedRuneSchema).max(PROPERTY_RUNES_STORED_MAX).readonly().check(uniqueEtchedRunes).default([]),
});
export type ItemRunes = z.infer<typeof ItemRunesSchema>;

export const NO_RUNES: ItemRunes = ItemRunesSchema.parse({});

/** A rune on an item: a fundamental rune by what it is, a property rune by its content. */
export const RuneRefSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(RuneType.Fundamental), rune: z.enum(FundamentalRune) }),
  z.strictObject({ type: z.literal(RuneType.Property), rune: ContentId, choice: RuneChoice.optional() }),
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
  z.strictObject({ type: z.literal(RuneType.Property), rune: ContentId, choice: RuneChoice.optional() }),
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
