import { CreateKeyItemBody, KeyItemName, KeyItemNotes, ReviewedRuneId } from '@pioneer/campaign/domain';
import type { KeyPropertyRune, ReviewedName } from '@pioneer/campaign/domain';
import * as z from 'zod';

/** The grades a potency, striking or resilient rune has, as the select holds them. */
export const RUNE_GRADES = ['1', '2', '3', '4'] as const;
/** The grades a reinforcing rune has, minor to supreme. */
export const REINFORCING_GRADES = ['1', '2', '3', '4', '5', '6'] as const;

/** No rune of that kind, as a select holds it. */
export const NO_GRADE = '';

/** A grade a select holds, or none. */
type GradeChoice = typeof NO_GRADE | (typeof RUNE_GRADES)[number];
/** A reinforcing grade a select holds, or none. */
type ReinforcingChoice = typeof NO_GRADE | (typeof REINFORCING_GRADES)[number];

/** What the form holds: strings throughout, as its controls do. */
export interface KeyItemModel {
  readonly name: string;
  readonly base: string;
  readonly notes: string;
  readonly potency: GradeChoice;
  readonly striking: GradeChoice;
  readonly resilient: GradeChoice;
  readonly reinforcing: ReinforcingChoice;
}

export const EMPTY_KEY_ITEM: KeyItemModel = {
  name: '',
  base: '',
  notes: '',
  potency: NO_GRADE,
  striking: NO_GRADE,
  resilient: NO_GRADE,
  reinforcing: NO_GRADE,
};

const Grade = z.union([z.literal(NO_GRADE), z.enum(RUNE_GRADES)]);
const ReinforcingGrade = z.union([z.literal(NO_GRADE), z.enum(REINFORCING_GRADES)]);

/** What the form submits, checked with the schemas the server validates with. */
export const KeyItemForm = z.object({
  name: KeyItemName,
  base: ReviewedRuneId,
  notes: z.union([z.literal(''), KeyItemNotes]),
  potency: Grade,
  striking: Grade,
  resilient: Grade,
  reinforcing: ReinforcingGrade,
});

/** A grade the select holds as a number, or none. */
function graded(value: string): number | undefined {
  return value === NO_GRADE ? undefined : Number(value);
}

/** The base item the GM picked, with the name the campaign shows for it. */
export interface PickedBase {
  readonly item: ReviewedRuneId;
  readonly name: ReviewedName;
}

/** The request a submitted form makes: the picked base item, the runes the GM stated and the property runes added. */
export function toCreateBody(
  model: KeyItemModel,
  base: PickedBase,
  property: readonly KeyPropertyRune[],
): CreateKeyItemBody {
  const { name, notes, potency, striking, resilient, reinforcing } = KeyItemForm.parse(model);
  return CreateKeyItemBody.parse({
    name,
    base,
    notes,
    runes: {
      potency: graded(potency),
      striking: graded(striking),
      resilient: graded(resilient),
      reinforcing: graded(reinforcing),
      property,
    },
  });
}
