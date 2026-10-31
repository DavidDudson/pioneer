import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { Rarity } from './entry-fields';
import { RulesMessage } from './messages';
import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { uniqueItems } from './unique-items';

const GRANTED_MAX = 16;

/** How many languages a character picks from one source. */
export const LanguageCount = Pg.smallint().nonnegative().brand<'LanguageCount'>();
export type LanguageCount = z.infer<typeof LanguageCount>;

/** The slots a `Language` element opens: at least one. */
const LanguageSlots = Pg.smallint().positive().brand<'LanguageCount'>();

/** The rarest a language slot may offer; unique languages are only ever granted. */
export const LanguageAccess = z.enum({ Common: Rarity.Common, Uncommon: Rarity.Uncommon, Rare: Rarity.Rare });
export type LanguageAccess = z.infer<typeof LanguageAccess>;

/**
 * Languages a feature teaches while its predicate holds: those it `grant`s outright, and `slots` the player fills,
 * each offering the character's ancestry languages and any language no rarer than `access` (common when absent).
 * A Pioneer element: Foundry writes a feat's languages as `subfeatures.languages` and extra slots as an
 * `ActiveEffectLike` on `system.build.languages.max`, which the importer translates to it.
 */
export const LanguageElement = z
  .strictObject({
    key: z.literal(RuleElementKey.Language),
    grant: z.array(ContentId).min(1).max(GRANTED_MAX).readonly().check(uniqueItems).optional(),
    slots: LanguageSlots.optional(),
    access: LanguageAccess.optional(),
    ...ruleElementBase,
  })
  .refine(
    ({ grant, slots }) => grant !== undefined || slots !== undefined,
    issueParams(message(RulesMessage.LanguageGrantOrSlots)),
  );
export type LanguageElement = z.infer<typeof LanguageElement>;
