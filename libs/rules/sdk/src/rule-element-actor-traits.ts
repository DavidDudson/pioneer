import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';
import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { Trait } from './trait';
import { uniqueItems } from './unique-items';

/** The most traits one element adds or removes: a plant heritage removes four. */
const TRAITS_MAX = 8;

const Traits = z.array(Trait).max(TRAITS_MAX).readonly().check(uniqueItems);

/**
 * Adds traits to the character, or removes them, as Foundry pf2e's `ActorTraits` does (ADR-0048): a cleric's holy or
 * unholy trait, a versatile heritage's. The character's traits are its ancestry's, with each added trait and without
 * each removed one; a removal wins over an addition. Each sets `self:trait:<trait>`, which rules read.
 */
export const ActorTraitsElement = z
  .strictObject({
    key: z.literal(RuleElementKey.ActorTraits),
    add: Traits.optional(),
    remove: Traits.optional(),
    ...ruleElementBase,
  })
  .refine(
    ({ add = [], remove = [] }) => add.length + remove.length > 0,
    issueParams(message(RulesMessage.ActorTraitsAddOrRemove)),
  );
export type ActorTraitsElement = z.infer<typeof ActorTraitsElement>;
