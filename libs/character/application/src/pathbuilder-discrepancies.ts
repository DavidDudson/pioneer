import {
  buildRanks,
  characterGrants,
  characterSpellcasting,
  characterStatisticInputs,
  characterStatistics,
} from '@pioneer/character/domain';
import type { Character, SlotContent } from '@pioneer/character/domain';
import {
  ARMOR_CLASS,
  DERIVED_TOTAL_STATISTICS,
  discrepancyReport,
  documentFocus,
  LAND_SPEED,
  MAX_HIT_POINTS,
  RANKED_STATISTICS,
  SPELLCASTING,
} from '@pioneer/interop/pathbuilder';
import type {
  DiscrepancyReport,
  PathbuilderImport,
  PioneerSpellDc,
  PioneerSpellSlots,
  PioneerValues,
} from '@pioneer/interop/pathbuilder';
import type { SpellcastingInPlay, StatisticResult } from '@pioneer/rules/engine';
import { Proficiency, Selector as SelectorSchema, SPELL_RANK_MAX, SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentRegistry, Selector, VariantRuleEntry } from '@pioneer/rules/sdk';

/** The totals the report compares. */
const TOTALS: readonly Selector[] = [ARMOR_CLASS, MAX_HIT_POINTS, LAND_SPEED, ...DERIVED_TOTAL_STATISTICS];

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

/**
 * Whether the engine derives the rank of `selector` for the character: a statistic's own when that statistic is
 * derived, an armor or weapon category's when armor class is, the spellcasting rank when some entry's spell DC is.
 * Without that content an untrained rank would read as a difference.
 */
function rankDerivable(statistics: ReadonlyMap<Selector, StatisticResult>, selector: Selector): boolean {
  if (selector === SPELLCASTING) {
    return [...statistics.keys()].some((key) => key.startsWith('spell-dc:'));
  }
  const category = selector.startsWith('defense:') || selector.startsWith('attack:');
  return derived(statistics, category ? ARMOR_CLASS : selector) !== undefined;
}

/** An entry's own slots per day, cantrips first and then each rank to the tenth: the order Pathbuilder's `perDay` is in. */
function slotCounts({ slots }: SpellcastingInPlay): number[] {
  return [
    slots.cantrips ?? 0,
    ...Array.from(
      { length: SPELL_RANK_MAX },
      (_unused, index) => slots.ranks.find(({ rank }) => rank === index + 1)?.count ?? 0,
    ),
  ];
}

/** The slots per day of each entry that picks its spells, which a Pathbuilder caster that prepares or is spontaneous compares with. */
function spellSlots(entries: readonly SpellcastingInPlay[]): PioneerSpellSlots[] {
  return entries.flatMap((entry): PioneerSpellSlots[] =>
    entry.preparation === SpellPreparation.Prepared || entry.preparation === SpellPreparation.Spontaneous
      ? [{ slug: entry.slug, preparation: entry.preparation, tradition: entry.tradition, counts: slotCounts(entry) }]
      : [],
  );
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
  const focus = documentFocus(document, slots);
  return {
    spellSlots: spellSlots(characterSpellcasting(characterGrants(document, slots))),
    focusPoints: focus.entries.length === 0 ? undefined : focus.pool,
    spellDcs: (inputs.spellcasting ?? []).flatMap(({ slug, tradition, attribute }): PioneerSpellDc[] => {
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
      [...Object.values(RANKED_STATISTICS), SPELLCASTING].flatMap((selector): [Selector, Proficiency][] =>
        rankDerivable(statistics, selector) ? [[selector, ranks.get(selector) ?? Proficiency.Untrained]] : [],
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
