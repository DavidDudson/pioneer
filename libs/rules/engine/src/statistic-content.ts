import { ContentId, OriginHopKind, RuleIndex } from '@pioneer/rules/sdk';
import type { ContentRegistry, VariantRuleEntry } from '@pioneer/rules/sdk';

import type { StatisticContent } from './derive-statistics';
import type { RuleInPlay } from './rule-in-play';

/**
 * What a derivation reads from the registry: every statistic, in registration order so a later pack's definition of
 * a selector replaces an earlier one, and the proficiency bonus table. Undefined until a pack defines the table
 * (the core rules pack does), since `@prof` has nothing to read without it.
 */
export function statisticContent(registry: ContentRegistry): StatisticContent | undefined {
  const proficiencyBonus = registry.proficiencyBonus();
  if (proficiencyBonus === undefined) {
    return undefined;
  }
  return { definitions: registry.statistics().map(({ definition }) => definition), proficiencyBonus };
}

/**
 * The rule elements of the variant rules enabled for a character, in play with a `variant` origin hop naming the
 * variant, so every line they explain cites it and its sources.
 */
export function variantRulesInPlay(variants: readonly VariantRuleEntry[]): readonly RuleInPlay[] {
  return variants.flatMap(({ id, definition }) => {
    const entry = ContentId.parse(id);
    const origin = { hops: [{ kind: OriginHopKind.Variant, rule: entry }], entry, sources: definition.sources };
    return definition.rules.map((element, index) => ({ element, origin, rule: RuleIndex.parse(index) }));
  });
}
