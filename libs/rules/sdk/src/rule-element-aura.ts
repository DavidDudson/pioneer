import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { FormulaSource } from './formula-source';
import { ruleElementBase, RuleElementKey, RuleSlug } from './rule-element-base';
import { Trait } from './trait';
import { uniqueItems } from './unique-items';
import { Feet } from './units';

/** Who an aura's effect reaches, besides the bearer unless `includesSelf` says otherwise. */
export const AuraAffects = { Allies: 'allies', Enemies: 'enemies', All: 'all' } as const;
export type AuraAffects = ValueOf<typeof AuraAffects>;

/** When an aura applies its effect: as a creature enters it, or as a turn starts or ends inside it. */
export const AuraEvent = { Enter: 'enter', TurnStart: 'turn-start', TurnEnd: 'turn-end' } as const;
export type AuraEvent = ValueOf<typeof AuraEvent>;

/** The most effects, traits and events an aura lists. */
const LIST_MAX = 8;

/** An effect an aura gives the creatures it reaches. */
const AuraEffect = z.strictObject({
  effect: ContentId,
  affects: z.enum(AuraAffects).optional(),
  includesSelf: z.boolean().optional(),
  events: z.array(z.enum(AuraEvent)).min(1).max(LIST_MAX).readonly().check(uniqueItems).optional(),
});
type AuraEffect = z.infer<typeof AuraEffect>;

/**
 * An area around the bearer, as Foundry pf2e's `Aura` makes: `radius` in feet (or a formula), the `traits` it carries,
 * and the effects it gives the creatures inside. An aura with no effect is a marker other rules read.
 */
export const AuraElement = z.strictObject({
  key: z.literal(RuleElementKey.Aura),
  slug: RuleSlug.optional(),
  radius: z.union([Feet, FormulaSource]),
  traits: z.array(Trait).max(LIST_MAX).readonly().check(uniqueItems).optional(),
  effects: z.array(AuraEffect).max(LIST_MAX).readonly().optional(),
  ...ruleElementBase,
});
export type AuraElement = z.infer<typeof AuraElement>;
