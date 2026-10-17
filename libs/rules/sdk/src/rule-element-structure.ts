import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId, Slug } from './content-id';
import { ContentKindSchema } from './content-kind';
import { ContentText } from './content-text';
import { RulesMessage } from './messages';
import { ConditionValue } from './origin';
import { Predicate } from './predicate';
import { RollOption } from './roll-option';
import { RollOptionNamespace } from './roll-option-namespace';
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
  /**
   * The value a valued condition arrives with (Clumsy 1), Foundry's `badge-value` alteration. Without one a valued
   * condition arrives at 1, Foundry's default; a grant of anything else ignores it.
   */
  value: ConditionValue.optional(),
  /**
   * The answers the granted entry's own `ChoiceSet`s start with, by their flag, as Foundry's `preselectChoices` (the
   * Assurance a background grants arrives with Athletics picked).
   */
  choices: z.record(RuleSlug, ChoiceValue).optional(),
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

/**
 * What a query's candidate must share with the character: the trait named like the character's class (Natural
 * Ambition's "a class feat for your class") or ancestry (Ancestral Paragon's "an ancestry feat"). Foundry reads the
 * actor's class and ancestry trait in the filter itself (`item:trait:{actor|system.details.class.trait}`), which a
 * roll option cannot spell.
 */
export const OwnTrait = { Class: 'class', Ancestry: 'ancestry' } as const;
export type OwnTrait = (typeof OwnTrait)[keyof typeof OwnTrait];

/** Every entry of a kind whose roll options satisfy `filter`: "a 1st-level fighter feat". */
export const ChoiceQuery = z.strictObject({
  kind: ContentKindSchema,
  filter: Predicate,
  /** The candidate must also carry a trait named like one of the character's classes or ancestry. */
  ownTrait: z.enum([OwnTrait.Class, OwnTrait.Ancestry]).optional(),
});
export type ChoiceQuery = z.infer<typeof ChoiceQuery>;

/**
 * Asks the player to pick, and stores the pick under `flag`. Unanswered, it is an open slot in the
 * builder. With `rollOption`, a namespace (`favored-terrain`, `kinetic-gate:initial`), the pick also becomes a roll
 * option in it (`favored-terrain:forest`). With `optional`, the player may leave it unanswered (Foundry's
 * `allowNoSelection`).
 */
export const ChoiceSetElement = z.strictObject({
  key: z.literal(RuleElementKey.ChoiceSet),
  flag: RuleSlug,
  choices: z.union([z.array(ChoiceOption).min(1).max(CHOICES_MAX), ChoiceQuery]),
  prompt: ContentText.optional(),
  rollOption: RollOptionNamespace.optional(),
  optional: z.boolean().optional(),
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
