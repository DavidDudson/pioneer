import * as z from 'zod';

import { ContentId } from './content-id';
import { Predicate } from './predicate';
import { uniqueItems } from './unique-items';

/** The most effects a spell or an action lists. */
const EFFECTS_MAX = 32;

/** An effect a spell or an action can put on the user: its id, or its id with the predicate that offers it. */
const SpellEffectEntry = z.union([ContentId, z.strictObject({ effect: ContentId, predicate: Predicate })]);

const WrappedEffect = z.looseObject({ effect: ContentId });

export type SpellEffectEntry = z.infer<typeof SpellEffectEntry>;

/** The id of the effect `entry` lists. */
export function spellEffectId(entry: SpellEffectEntry): ContentId {
  const wrapped = WrappedEffect.safeParse(entry);

  return wrapped.success ? wrapped.data.effect : ContentId.parse(entry);
}

/** A `.check` for the effects a spell or an action lists: each effect is listed once, whatever its predicate. */
function uniqueEffects(context: z.core.ParsePayload<ReadonlyArray<SpellEffectEntry>>): void {
  uniqueItems({ ...context, value: context.value.map((entry) => spellEffectId(entry)) });
}

/**
 * The effects a spell or an action can put on the user, one per form it offers (Animal Form has one for each animal), so
 * using it can offer the forms. An effect with a predicate is offered only to a character it holds for (Untamed Form
 * lists Plant Form for a character with `feat:plant-shape`).
 */
export const FormEffects = z.array(SpellEffectEntry).min(1).max(EFFECTS_MAX).readonly().check(uniqueEffects);
