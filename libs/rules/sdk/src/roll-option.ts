import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';

/**
 * Lowercase alphanumeric words joined by single `-` or `:`, like a selector. A roll option also
 * needs a namespace, so at least one `:`: `self:condition:frightened`, `terrain:forest`.
 */
const WORDS = /^[a-z\d](?:[a-z\d]|[-:](?=[a-z\d]))*$/u;
const ROLL_OPTION_LENGTH_MAX = 256;

function isRollOption(value: unknown): boolean {
  return typeof value === 'string' && WORDS.test(value) && value.includes(':');
}

/**
 * A fact about the current state, as Foundry pf2e spells them. The namespace (first word) decides
 * whether an absent option means false or unknown (ADR-0002).
 */
export const RollOption = z
  .string()
  .max(ROLL_OPTION_LENGTH_MAX)
  .refine((value) => isRollOption(value), issueParams(message(RulesMessage.RollOptionFormat)))
  .brand<'RollOption'>();
export type RollOption = z.infer<typeof RollOption>;
