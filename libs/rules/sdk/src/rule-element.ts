import { issueParams, message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { RulesMessage } from './messages';
import { RuleElementKey } from './rule-element-base';
import { ItemAlterationElement } from './rule-element-item-alteration';
import {
  AdjustModifierElement,
  ChangeElement,
  DexterityCapElement,
  FlatModifierElement,
  MultipleAttackPenaltyElement,
} from './rule-element-numbers';
import { ChoiceSetElement, GrantItemElement, RollOptionElement } from './rule-element-structure';

const KNOWN_KEYS: ReadonlySet<unknown> = new Set(Object.values(RuleElementKey));

/** Rule elements Pioneer reads, one schema per `key`. Further groups join this union as they land. */
const Element = z.discriminatedUnion('key', [
  GrantItemElement,
  ChoiceSetElement,
  RollOptionElement,
  ItemAlterationElement,
  FlatModifierElement,
  AdjustModifierElement,
  ChangeElement,
  DexterityCapElement,
  MultipleAttackPenaltyElement,
]);

/** Names the `key` when the value is an object whose `key` is a string Pioneer does not know. */
function unknownKeyMessage(value: unknown): MessageDescriptor | undefined {
  if (typeof value !== 'object' || value === null || !('key' in value)) {
    return undefined;
  }
  const { key } = value;
  return typeof key === 'string' && !KNOWN_KEYS.has(key) ? message(RulesMessage.UnknownElement, { key }) : undefined;
}

/**
 * One rule element: a data instruction on a content entry (ADR-0008). An unknown `key` is an
 * error naming that key, so an importer can report the Foundry element it cannot translate.
 */
export const RuleElement: z.ZodType<RuleElement> = z
  .unknown()
  .check((context) => {
    const unknown = unknownKeyMessage(context.value);
    if (unknown !== undefined) {
      context.issues.push({ code: 'custom', input: context.value, path: ['key'], ...issueParams(unknown) });
    }
  })
  .pipe(Element);
export type RuleElement = z.output<typeof Element>;

const RULES_MAX = 64;

/** A content entry's `rules`: its elements in order (an origin's `RuleIndex` points into it). */
export const RuleElements = z.array(RuleElement).max(RULES_MAX);
export type RuleElements = readonly RuleElement[];
