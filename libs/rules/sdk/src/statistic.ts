import type { ValueOf } from '@pioneer/shared/kernel';
import { Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeSchema } from './attribute';
import { Slug } from './content-id';
import { ContentText } from './content-text';
import { ActorFormulaSource } from './formula-source';
import { Domain, Selector } from './selector';

/** Id of a statistic content entry (UUIDv5 of `<pack>/<slug>`). */
export const StatisticId = Uuid.brand<'StatisticId'>();
export type StatisticId = z.infer<typeof StatisticId>;

/** Whether a statistic is rolled (a check, such as Perception) or stands as a target (a DC, such as AC). */
export const StatisticKind = { Check: 'check', Dc: 'dc' } as const;
export type StatisticKind = ValueOf<typeof StatisticKind>;
export const StatisticKindSchema = z.enum(StatisticKind);

/**
 * A named number the engine derives: AC, a save, a skill, a homebrew check. Statistics are content, so packs
 * define them (rules-engine.md, "Statistics are content").
 */
export const StatisticDefinition = z.strictObject({
  slug: Slug,
  name: ContentText,
  /** The stable key modifiers and references use (`ac`, `save:fortitude`); unique within a pack. */
  selector: Selector,
  /** The groups a modifier can target to reach this statistic too (`check`, `dex-based`). */
  domains: z.array(Domain).readonly(),
  /** The value before modifiers, from the character's own values only (`10 + @attr.dex.capped + @prof.ac`). */
  base: ActorFormulaSource,
  kind: StatisticKindSchema,
  /** The attribute the statistic is keyed to, where it has one (Dexterity for Reflex). */
  keyAttribute: AttributeSchema.optional(),
});
export type StatisticDefinition = z.infer<typeof StatisticDefinition>;

/** A statistic's `data` on the `ContentEntry` envelope: the definition less what the envelope carries. */
export const StatisticData = StatisticDefinition.omit({ slug: true, name: true });
export type StatisticData = z.infer<typeof StatisticData>;
