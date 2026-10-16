import { buildRanks, characterStatisticInputs, characterStatistics } from '@pioneer/character/domain';
import type { Character, SlotContent } from '@pioneer/character/domain';
import {
  ARMOR_CLASS,
  discrepancyReport,
  LAND_SPEED,
  MAX_HIT_POINTS,
  RANKED_STATISTICS,
} from '@pioneer/interop/pathbuilder';
import type { DiscrepancyReport, PathbuilderImport, PioneerSpellDc, PioneerValues } from '@pioneer/interop/pathbuilder';
import type { StatisticResult } from '@pioneer/rules/engine';
import { Proficiency, Selector as SelectorSchema } from '@pioneer/rules/sdk';
import type { ContentRegistry, Selector, VariantRuleEntry } from '@pioneer/rules/sdk';

/** The totals the report compares. */
const TOTALS: readonly Selector[] = [ARMOR_CLASS, MAX_HIT_POINTS, LAND_SPEED];

/** What the statistics are derived from beside the character: the registry, its slot content and the variants in force. */
export interface DerivationContent {
  readonly registry: ContentRegistry;
  readonly slots: SlotContent;
  readonly variants: readonly VariantRuleEntry[];
}

function derived(statistics: ReadonlyMap<Selector, StatisticResult>, selector: Selector): number | undefined {
  const result = statistics.get(selector);
  return result?.ok === true ? result.total : undefined;
}

/** What the engine derives for `character`, for the statistics it could derive: a failed or missing one is left out. */
function pioneerValues(character: Character, { registry, slots, variants }: DerivationContent): PioneerValues {
  const { document } = character;
  const inputs = characterStatisticInputs(registry, document, slots);
  const statistics = characterStatistics(document, {
    registry,
    slots,
    inputs,
    variants,
  });
  const ranks = buildRanks(document, slots);
  return {
    spellDcs: inputs.spellcasting.flatMap(({ slug, tradition, attribute }): PioneerSpellDc[] => {
      const selector = SelectorSchema.parse(`spell-dc:${slug}`);
      const total = derived(statistics, selector);
      return total === undefined ? [] : [{ selector, tradition, attribute, total }];
    }),
    totals: new Map(
      TOTALS.flatMap((selector): [Selector, number][] => {
        const total = derived(statistics, selector);
        return total === undefined ? [] : [[selector, total]];
      }),
    ),
    ranks: new Map(
      Object.values(RANKED_STATISTICS).flatMap((selector): [Selector, Proficiency][] =>
        derived(statistics, selector) === undefined ? [] : [[selector, ranks.get(selector) ?? Proficiency.Untrained]],
      ),
    ),
  };
}

/** The numbers Pathbuilder computed beside the engine's for the character it made (#312). */
export function importDiscrepancies(
  value: PathbuilderImport,
  character: Character,
  content: DerivationContent,
): DiscrepancyReport {
  return discrepancyReport(value, pioneerValues(character, content));
}
