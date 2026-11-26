import * as z from 'zod';

import { ContentKind } from './content-kind';
import { CreatureDefinitionModel, NPC_ONLY, npcDetailsOnNpc } from './creature';
import { creatureAbilityFields, LIST_MAX, REACTION_TRIGGER, reactionHasTrigger } from './creature-stat-block';
import { KIND_DATA_MODEL } from './kind-data';
import { RuleElements } from './rule-element';
import { VariantRuleModel } from './variant-rule';

/**
 * The content model holds `rules` as references (`rule-reference.ts`); this file is where the elements are parsed
 * whole. A content entry, pack or stat block read through these schemas has typed rule elements, and every one is
 * validated, as it was when the model held `RuleElements` itself.
 */

/** A content entry's `rules`: every element parsed, in order. */
export const EntryRules = RuleElements.readonly();

/** A special ability on a stat block, with its rule elements parsed. */
export const CreatureAbility = z
  .strictObject({ ...creatureAbilityFields, rules: EntryRules })
  .refine(reactionHasTrigger, REACTION_TRIGGER);

export type CreatureAbility = z.infer<typeof CreatureAbility>;

const CreatureAbilities = z.array(CreatureAbility).max(LIST_MAX).readonly().optional();

/** Schema every pack's creature (stat block) entries must satisfy, with its abilities' rule elements parsed. */
export const CreatureDefinition = CreatureDefinitionModel.extend({ abilities: CreatureAbilities });

export type CreatureDefinition = z.infer<typeof CreatureDefinition>;

/** A creature's `data` on the `ContentEntry` envelope: the stat block less what the envelope carries. */
export const CreatureData = z
  .strictObject(CreatureDefinition.omit({ slug: true, name: true, level: true, traits: true }).shape)
  .refine(npcDetailsOnNpc, NPC_ONLY);

export type CreatureData = z.infer<typeof CreatureData>;

/** A variant rule as a pack defines it, with its rule elements parsed. */
export const VariantRuleDefinition = VariantRuleModel.extend({ rules: RuleElements });

export type VariantRuleDefinition = z.infer<typeof VariantRuleDefinition>;

/** The `data` schema for each kind that has one: `KIND_DATA_MODEL` with a creature's rule elements parsed. */
export const KIND_DATA = { ...KIND_DATA_MODEL, [ContentKind.Creature]: CreatureData } as const;
