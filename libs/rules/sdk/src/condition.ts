import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { ConditionValue } from './origin';
import { RichText } from './rich-text';
import { Selector } from './selector';
import { SpellRank } from './spell-rank';

/**
 * How Foundry pf2e groups conditions on the sheet. A group says nothing about stacking: Dying, Wounded and Doomed
 * share `death` and apply together. Conditions that replace each other say so in `overrides`.
 */
export const ConditionGroup = {
  Abilities: 'abilities',
  Attitudes: 'attitudes',
  Death: 'death',
  Detection: 'detection',
  Senses: 'senses',
} as const;
export type ConditionGroup = ValueOf<typeof ConditionGroup>;
const ConditionGroupSchema = z.enum(ConditionGroup);
const CONDITION_REFS_MAX = 8;
const ENDINGS_MAX = 12;
const LOWER_BY_MAX = 9;
const CHECK_SELECTORS_MAX = 4;
const OTHERS_BY_MAX = 24;
const STAGES_MAX = 9;

/** What ends or eases a condition for the character without anyone editing it. */
export const ConditionTrigger = {
  /** The Rest action or a full night (Player Core, Resting). */
  Rest: 'rest',
  /** The start of the character's turn. */
  TurnStart: 'turn-start',
  /** The end of the character's turn. */
  TurnEnd: 'turn-end',
  /** The condition's own duration runs out. */
  DurationEnd: 'duration-end',
} as const;
export type ConditionTrigger = ValueOf<typeof ConditionTrigger>;

/** What an ending does to the condition: end it, or lower its value (it ends at 0). */
export const ConditionEffect = {
  Remove: 'remove',
  Lower: 'lower',
} as const;
export type ConditionEffect = ValueOf<typeof ConditionEffect>;

/** How many points a lowering takes off. */
const LowerBy = z.int().min(1).max(LOWER_BY_MAX).brand<'LowerBy'>();

/** How an entry that eases a condition does it: it ends it, lowers its value, or attempts to counteract it. */
export const ConditionRemovalEffect = {
  Remove: 'remove',
  Lower: 'lower',
  Counteract: 'counteract',
} as const;
export type ConditionRemovalEffect = ValueOf<typeof ConditionRemovalEffect>;

/** What an ending does: remove the condition, or lower its value by `by` (1 when absent). */
export const ConditionChange = z.strictObject({
  effect: z.enum(ConditionEffect),
  by: LowerBy.optional(),
});
export type ConditionChange = z.infer<typeof ConditionChange>;

/**
 * A DC as a whole number or `10 + @value` (the condition's current value), which the sheet evaluates for the value the
 * character holds: the Dying recovery check is `10 + @value`, persistent damage's flat check is `15`.
 */
export const ConditionDc = z
  .string()
  .regex(/^\d{1,2}(?<value> \+ @value)?$/u)
  .brand<'ConditionDc'>();
export type ConditionDc = z.infer<typeof ConditionDc>;

/**
 * A check that ends or eases a condition. `against` is the statistics the character may roll (`save:fortitude`,
 * `skill:athletics`), empty for a flat check; `dc` is absent when it is another creature's (Escape).
 */
const ConditionCheck = z.strictObject({
  against: z.array(Selector).max(CHECK_SELECTORS_MAX).readonly(),
  dc: ConditionDc.optional(),
  /** The DC when someone helps, where the rules give one (persistent damage, DC 10 when assisted). */
  assistedDc: ConditionDc.optional(),
});

/** Fields every ending has: its rule text, as content in the source locale (ADR-0009), never built in code. */
const endingText = { text: RichText } as const;

/** How a condition ends or eases, by kind (Player Core, Conditions). */
export const ConditionEnding = z.discriminatedUnion('kind', [
  /** Happens by itself: at a trigger, the condition changes. */
  z.strictObject({
    kind: z.literal('automatic'),
    trigger: z.enum(ConditionTrigger),
    change: ConditionChange,
    ...endingText,
  }),
  /** A check the character rolls (a recovery check, a flat check), whose success changes the condition. */
  z.strictObject({ kind: z.literal('check'), check: ConditionCheck, change: ConditionChange, ...endingText }),
  /** An action anyone can take (Stand, Escape, Treat Wounds); `action` links its entry where there is one. */
  z.strictObject({
    kind: z.literal('action'),
    action: ContentId.optional(),
    check: ConditionCheck.optional(),
    change: ConditionChange,
    ...endingText,
  }),
  /**
   * Restored by spells, features or items; `by` names the entries that do it, so the sheet can say which of them the
   * character has. Empty where the rules name none (an ability the character may have, with no entry of its own).
   */
  z.strictObject({
    kind: z.literal('others'),
    by: z.array(ContentId).max(OTHERS_BY_MAX).readonly().default([]),
    ...endingText,
  }),
  /** Only the condition's source ends it: the effect, creature or hazard that imposed it. */
  z.strictObject({ kind: z.literal('source'), ...endingText }),
]);
export type ConditionEnding = z.infer<typeof ConditionEnding>;

/** What one value of a staged condition does: its rule text, as content in the source locale (ADR-0009). */
export const ConditionStage = z.strictObject({ value: ConditionValue, text: RichText });
export type ConditionStage = z.infer<typeof ConditionStage>;

/**
 * What each value of a valued condition means. Staged: every value has its own effect, listed in `stages` (Dying 1 to
 * 4, Stunned, Slowed, Doomed, Wounded). Formula: the effect scales with the value with no useful end, so one `text`
 * gives the rule once (Frightened, Clumsy, Drained, Enfeebled, Sickened, Stupefied).
 */
export const ConditionValues = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('staged'), stages: z.array(ConditionStage).min(1).max(STAGES_MAX).readonly() }),
  z.strictObject({ kind: z.literal('formula'), text: RichText }),
]);
export type ConditionValues = z.infer<typeof ConditionValues>;

/**
 * A condition's `data` on the `ContentEntry` envelope. What it does to statistics is in `rules`; this is what the
 * app needs to apply and stack it.
 */
export const ConditionData = z.strictObject({
  /** Whether it carries a value (Frightened 2) or is simply on or off (Blinded). */
  valued: z.boolean(),
  /** What each value means; absent for an unvalued condition, and for a valued one whose content does not say yet. */
  values: ConditionValues.optional(),
  group: ConditionGroupSchema.optional(),
  /** Conditions this one replaces while it lasts (Blinded overrides Dazzled). */
  overrides: z.array(ContentId).max(CONDITION_REFS_MAX).readonly(),
  /**
   * Conditions it brings with it (Grabbed implies Off-Guard and Immobilized). Each also needs a `GrantItem` in
   * `rules`, which is what applies it; this list is what the sheet shows.
   */
  implies: z.array(ContentId).max(CONDITION_REFS_MAX).readonly(),
  /** Every way it ends or eases, each with its rule text; Player Core conditions always have at least one. */
  recovery: z.array(ConditionEnding).max(ENDINGS_MAX).readonly().default([]),
});
export type ConditionData = z.infer<typeof ConditionData>;

const REMOVALS_MAX = 12;

/**
 * A condition a spell, feat, action or consumable removes or lowers, declared on that entry so the sheet can say what
 * this character has that eases a condition it holds. `by` is how many points a `lower` takes off (1 when absent);
 * `rank` is the rank of a `counteract`, where the entry states one.
 */
export const ConditionRemoval = z
  .strictObject({
    condition: ContentId,
    effect: z.enum(ConditionRemovalEffect),
    by: LowerBy.optional(),
    rank: SpellRank.optional(),
  })
  .refine(({ effect, by }) => by === undefined || effect === ConditionRemovalEffect.Lower, { path: ['by'] })
  .refine(({ effect, rank }) => rank === undefined || effect === ConditionRemovalEffect.Counteract, { path: ['rank'] });
export type ConditionRemoval = z.infer<typeof ConditionRemoval>;

/** The conditions an entry removes or lowers: absent where it removes none. */
export const removesConditions = {
  removesConditions: z.array(ConditionRemoval).min(1).max(REMOVALS_MAX).readonly().optional(),
} as const;
