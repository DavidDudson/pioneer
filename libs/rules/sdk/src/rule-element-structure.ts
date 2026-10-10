import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId, Slug } from './content-id';
import { ContentKindSchema } from './content-kind';
import { ContentText } from './content-text';
import { RulesMessage } from './messages';
import { Predicate } from './predicate';
import { RollOption } from './roll-option';
import { RuleElementKey, ruleElementBase, RuleSlug } from './rule-element-base';
import { Domain } from './selector';

/** A choice's stored value: a content entry (`ContentId`) or a plain option (`forest`). */
export const ChoiceValue = z.union([ContentId, Slug]);
export type ChoiceValue = z.infer<typeof ChoiceValue>;

/** Grants the selection a `ChoiceSet` stored under `choice`, rather than a fixed entry. */
export const ChoiceRef = z.strictObject({ choice: RuleSlug });
export type ChoiceRef = z.infer<typeof ChoiceRef>;

/** Gives the character another content entry (a feature, action, spell or item), with its own rules. */
export const GrantItemElement = z.strictObject({
  key: z.literal(RuleElementKey.GrantItem),
  item: z.union([ContentId, ChoiceRef]),
  /** Name of the granted entry, for later elements to refer to. */
  flag: RuleSlug.optional(),
  /** Grant it even when the character already has it. */
  allowDuplicate: z.boolean().optional(),
  ...ruleElementBase,
});
export type GrantItemElement = z.infer<typeof GrantItemElement>;

const CHOICES_MAX = 64;

/** One option the player can pick, shown only while its predicate holds. */
export const ChoiceOption = z.strictObject({
  value: ChoiceValue,
  label: ContentText,
  predicate: Predicate.optional(),
});
export type ChoiceOption = z.infer<typeof ChoiceOption>;

/** Every entry of a kind whose roll options satisfy `filter`: "a 1st-level fighter feat". */
export const ChoiceQuery = z.strictObject({
  kind: ContentKindSchema,
  filter: Predicate,
});
export type ChoiceQuery = z.infer<typeof ChoiceQuery>;

/**
 * Asks the player to pick, and stores the pick under `flag`. Unanswered, it is an open slot in the
 * builder. With `rollOption`, the pick also becomes a roll option (`favored-terrain:forest`).
 */
export const ChoiceSetElement = z.strictObject({
  key: z.literal(RuleElementKey.ChoiceSet),
  flag: RuleSlug,
  choices: z.union([z.array(ChoiceOption).min(1).max(CHOICES_MAX), ChoiceQuery]),
  prompt: ContentText.optional(),
  rollOption: RuleSlug.optional(),
  ...ruleElementBase,
});
export type ChoiceSetElement = z.infer<typeof ChoiceSetElement>;

/** One variant of a toggle the player can switch between (a Rage's anger, an Aura's type). */
export const RollOptionSuboption = z.strictObject({
  value: Slug,
  label: ContentText,
  predicate: Predicate.optional(),
});
export type RollOptionSuboption = z.infer<typeof RollOptionSuboption>;

const SUBOPTIONS_MAX = 32;

/**
 * Sets a roll option in `domain` (default `all`). A toggle is one the player switches on and off;
 * `value` is its starting state, and only a toggle may offer suboptions.
 */
export const RollOptionElement = z
  .strictObject({
    key: z.literal(RuleElementKey.RollOption),
    domain: Domain.optional(),
    option: RollOption,
    toggleable: z.boolean().optional(),
    value: z.boolean().optional(),
    suboptions: z.array(RollOptionSuboption).min(1).max(SUBOPTIONS_MAX).optional(),
    ...ruleElementBase,
  })
  .refine((element) => element.suboptions === undefined || element.toggleable === true, {
    ...issueParams(message(RulesMessage.SuboptionsNeedToggle)),
    path: ['suboptions'],
  });
export type RollOptionElement = z.infer<typeof RollOptionElement>;
