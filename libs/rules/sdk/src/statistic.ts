import { FormulaText } from '@pioneer/rules/formula';
import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeSchema } from './attribute';
import { Slug } from './content-id';
import { ContentText } from './content-text';
import { ReferenceScope } from './formula-reference';
import { scopeProblems, StatisticFormulaSource } from './formula-source';
import type { FormulaSource } from './formula-source';
import { RulesMessage } from './messages';
import { Domain, Selector } from './selector';

/** Id of a statistic content entry (UUIDv5 of `<pack>/<slug>`). */
export const StatisticId = Uuid.brand<'StatisticId'>();
export type StatisticId = z.infer<typeof StatisticId>;

/**
 * Whether a statistic is rolled (a check, such as Perception), stands as a target (a DC, such as AC), or is a value
 * that is neither (Hit Points, a Speed).
 */
export const StatisticKind = { Check: 'check', Dc: 'dc', Value: 'value' } as const;
export type StatisticKind = ValueOf<typeof StatisticKind>;
export const StatisticKindSchema = z.enum(StatisticKind);

/**
 * What a statistic is derived once for: each equipped weapon (a Strike), or each spellcasting entry (a spell attack
 * and DC). A statistic without one is derived once for the character.
 */
export const StatisticPer = { Weapon: 'weapon', Spellcasting: 'spellcasting' } as const;
export type StatisticPer = ValueOf<typeof StatisticPer>;
export const StatisticPerSchema = z.enum(StatisticPer);

/** The scopes a base formula may read: the character's, and the source's when it is derived per source. */
const BASE_SCOPES: Readonly<Record<StatisticPer | 'character', ReadonlySet<ReferenceScope>>> = {
  character: new Set([ReferenceScope.Actor]),
  [StatisticPer.Weapon]: new Set([ReferenceScope.Actor, ReferenceScope.Weapon]),
  [StatisticPer.Spellcasting]: new Set([ReferenceScope.Actor, ReferenceScope.Spellcasting]),
};

const statisticFields = {
  slug: Slug,
  name: ContentText,
  /**
   * The stable key modifiers and references use (`ac`, `save:fortitude`); unique within a pack. A statistic derived
   * per source names the family: each weapon's or entry's is `<selector>:<source slug>` (`strike:longsword`).
   */
  selector: Selector,
  /** The groups a modifier can target to reach this statistic too (`check`, `dex-based`). */
  domains: z.array(Domain).readonly(),
  /**
   * The value before modifiers, from the character's own values (`10 + @attr.dex.capped + @prof.ac`), and the
   * source's when derived per source (`@weapon.attr + @weapon.prof`).
   */
  base: StatisticFormulaSource,
  kind: StatisticKindSchema,
  /** The attribute the statistic is keyed to, where it has one (Dexterity for Reflex). */
  keyAttribute: AttributeSchema.optional(),
  /** Derive it once per weapon or spellcasting entry instead of once. */
  per: StatisticPerSchema.optional(),
};

interface Scoped {
  readonly base: FormulaSource;
  readonly keyAttribute?: unknown;
  readonly per?: StatisticPer | undefined;
}

/**
 * A base formula reads a weapon or spellcasting entry only when the statistic is derived per that source, and a
 * statistic derived per source takes its key attribute from the source, so it names none.
 */
function checkScopes(context: z.core.ParsePayload<Scoped>): void {
  const { base, keyAttribute, per } = context.value;
  for (const { error } of scopeProblems(FormulaText.parse(base), BASE_SCOPES[per ?? 'character'])) {
    context.issues.push({ code: 'custom', input: base, path: ['base'], ...issueParams(error) });
  }
  if (per !== undefined && keyAttribute !== undefined) {
    const { params } = issueParams(message(RulesMessage.StatisticPerKeyAttribute));
    context.issues.push({ code: 'custom', input: keyAttribute, path: ['keyAttribute'], params });
  }
}

/**
 * A named number the engine derives: AC, a save, a skill, a homebrew check, a Strike. Statistics are content, so
 * packs define them (rules-engine.md, "Statistics are content").
 */
export const StatisticDefinition = z.strictObject(statisticFields).check(checkScopes);
export type StatisticDefinition = z.infer<typeof StatisticDefinition>;

const { slug: _slug, name: _name, ...dataFields } = statisticFields;

/** A statistic's `data` on the `ContentEntry` envelope: the definition less what the envelope carries. */
export const StatisticData = z.strictObject(dataFields).check(checkScopes);
export type StatisticData = z.infer<typeof StatisticData>;
