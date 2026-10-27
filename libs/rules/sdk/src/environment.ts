import { issueParams, message } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId, Slug } from './content-id';
import { ContentText } from './content-text';
import { DamageTypeSchema } from './damage';
import { RulesMessage } from './messages';
import { DurationCount, DurationUnitSchema } from './rich-text';
import { Trait } from './trait';

/** The most restrictions and consequences an environment lists. */
const LIST_MAX = 16;

/**
 * Something an environment forbids, with the reason the sheet shows. The `id` is how abilities name it to lift it
 * (`speech`, `fire-effects`), so it is unique within the environment. `blocks` names the action traits it forbids
 * (`fire`): an action with one of them reads as unavailable, with the reason. A restriction with none is text only.
 */
export const EnvironmentRestriction = z.strictObject({
  id: Slug,
  reason: ContentText,
  blocks: z.array(Trait).max(LIST_MAX).readonly().default([]),
});
export type EnvironmentRestriction = z.infer<typeof EnvironmentRestriction>;

/** How hard environmental damage hits (GM Core, Environmental Damage): the GM sets the dice within the category. */
export const EnvironmentDamageCategory = {
  Minor: 'minor',
  Moderate: 'moderate',
  Major: 'major',
  Massive: 'massive',
} as const;
export type EnvironmentDamageCategory = ValueOf<typeof EnvironmentDamageCategory>;

/** Damage an environment deals: its category, which sets the dice, and its type. */
export const EnvironmentDamage = z.strictObject({
  category: z.enum(EnvironmentDamageCategory),
  type: DamageTypeSchema,
});
export type EnvironmentDamage = z.infer<typeof EnvironmentDamage>;

/**
 * What happens to a character who stays in the environment: after `after` of time in it, either `applies` (a condition)
 * is put on them or they take `damage`, never both. With `repeats` it happens again each time that long passes.
 */
export const EnvironmentConsequence = z
  .strictObject({
    after: z.strictObject({ count: DurationCount, unit: DurationUnitSchema }),
    applies: ContentId.optional(),
    damage: EnvironmentDamage.optional(),
    repeats: z.boolean().optional(),
  })
  .refine(
    ({ applies, damage }) => (applies === undefined) !== (damage === undefined),
    issueParams(message(RulesMessage.ConsequenceAppliesOrDamage)),
  );
export type EnvironmentConsequence = z.infer<typeof EnvironmentConsequence>;

/** Restrictions name one thing each: a repeated id is an error at its index naming it. */
function uniqueRestrictionIds(context: z.core.ParsePayload<readonly EnvironmentRestriction[]>): void {
  const seen = new Set<string>();
  for (const [index, { id }] of context.value.entries()) {
    if (seen.has(id)) {
      context.issues.push({
        code: 'custom',
        input: context.value,
        path: [index, 'id'],
        ...issueParams(message(RulesMessage.ListDuplicate, { value: id })),
      });
    }
    seen.add(id);
  }
}

/**
 * An environment's `data` on the `ContentEntry` envelope: a situation a character is in (underwater, darkness, extreme
 * cold), which is not a condition. Its adjustments are its `rules`, applied while it is active; this is what it forbids
 * and what staying in it costs.
 */
export const EnvironmentData = z.strictObject({
  restrictions: z.array(EnvironmentRestriction).max(LIST_MAX).readonly().check(uniqueRestrictionIds).default([]),
  consequences: z.array(EnvironmentConsequence).max(LIST_MAX).readonly().default([]),
});
export type EnvironmentData = z.infer<typeof EnvironmentData>;
