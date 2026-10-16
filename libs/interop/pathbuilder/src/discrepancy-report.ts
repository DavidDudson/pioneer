import { Attribute, Proficiency, ProficiencySchema, Selector } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { RANK_BY_NUMBER } from './read-pathbuilder-export';
import type { PathbuilderImport } from './read-pathbuilder-export';

/** What a statistic is compared as: a total Pathbuilder computed, or the rank it gives. */
export const DiscrepancyKind = { Total: 'total', Rank: 'rank' } as const;

const Statistic = { selector: Selector, difference: z.int() };

/** A total Pathbuilder computed that the engine's differs from; `difference` is Pioneer's less Pathbuilder's. */
export const TotalDiscrepancy = z.object({
  kind: z.literal(DiscrepancyKind.Total),
  ...Statistic,
  pathbuilder: z.int(),
  pioneer: z.int(),
});
export type TotalDiscrepancy = z.infer<typeof TotalDiscrepancy>;

/** A proficiency rank Pathbuilder gives that the build's differs from; `difference` is the steps between them. */
export const RankDiscrepancy = z.object({
  kind: z.literal(DiscrepancyKind.Rank),
  ...Statistic,
  pathbuilder: ProficiencySchema,
  pioneer: ProficiencySchema,
});
export type RankDiscrepancy = z.infer<typeof RankDiscrepancy>;

export const Discrepancy = z.discriminatedUnion('kind', [TotalDiscrepancy, RankDiscrepancy]);
export type Discrepancy = z.infer<typeof Discrepancy>;

/** Every number Pathbuilder computed that was compared with the engine's, and those that differ. */
export const DiscrepancyReport = z.object({
  compared: z.int().nonnegative(),
  differences: z.array(Discrepancy).readonly(),
});
export type DiscrepancyReport = z.infer<typeof DiscrepancyReport>;

/** The statistics whose rank Pathbuilder gives, by the key it uses in `proficiencies`. */
const SKILLS: readonly string[] = [
  'acrobatics',
  'arcana',
  'athletics',
  'crafting',
  'deception',
  'diplomacy',
  'intimidation',
  'medicine',
  'nature',
  'occultism',
  'performance',
  'religion',
  'society',
  'stealth',
  'survival',
  'thievery',
];

/** Pathbuilder's key in `proficiencies` and the selector it ranks. */
type RankedKey = readonly [string, string];

const RANKED_KEYS: readonly RankedKey[] = [
  ['perception', 'perception'],
  ['fortitude', 'save:fortitude'],
  ['reflex', 'save:reflex'],
  ['will', 'save:will'],
  ['classDC', 'class-dc'],
  ...SKILLS.map((skill): RankedKey => [skill, `skill:${skill}`]),
];

/** The statistics whose rank Pathbuilder gives, by the key it uses in `proficiencies`. */
export const RANKED_STATISTICS: Readonly<Record<string, Selector>> = Object.fromEntries(
  RANKED_KEYS.map(([key, selector]): [string, Selector] => [key, Selector.parse(selector)]),
);

export const ARMOR_CLASS = Selector.parse('ac');
export const MAX_HIT_POINTS = Selector.parse('hp:max');
export const LAND_SPEED = Selector.parse('speed');

/** What the engine derived for the imported character: totals by statistic, and ranks of the statistics ranked. */
export interface PioneerValues {
  readonly totals: ReadonlyMap<Selector, number>;
  readonly ranks: ReadonlyMap<Selector, Proficiency>;
}

const RANKS: readonly Proficiency[] = Object.values(Proficiency);

/** The totals Pathbuilder computed: AC, maximum Hit Points from its parts and the Constitution modifier, and Speed. */
function reportedTotals(value: PathbuilderImport): Map<Selector, number> {
  const { acTotal, attributes } = value.reported;
  const totals = new Map<Selector, number>();
  if (acTotal !== undefined) {
    totals.set(ARMOR_CLASS, acTotal.acTotal);
  }
  if (attributes?.ancestryhp !== undefined && attributes.classhp !== undefined) {
    const perLevel =
      attributes.classhp + (attributes.bonushpPerLevel ?? 0) + value.attributes.get(Attribute.Constitution);
    totals.set(MAX_HIT_POINTS, attributes.ancestryhp + perLevel * value.level + (attributes.bonushp ?? 0));
  }
  if (attributes?.speed !== undefined) {
    totals.set(LAND_SPEED, attributes.speed + (attributes.speedBonus ?? 0));
  }
  return totals;
}

function totalDifferences(value: PathbuilderImport, { totals }: PioneerValues): [number, TotalDiscrepancy[]] {
  const compared = [...reportedTotals(value)].flatMap(([selector, pathbuilder]) => {
    const pioneer = totals.get(selector);
    return pioneer === undefined ? [] : [{ selector, pathbuilder, pioneer }];
  });
  const differing = compared
    .filter(({ pathbuilder, pioneer }) => pathbuilder !== pioneer)
    .map(({ selector, pathbuilder, pioneer }): TotalDiscrepancy => ({
      kind: DiscrepancyKind.Total,
      selector,
      pathbuilder,
      pioneer,
      difference: pioneer - pathbuilder,
    }));
  return [compared.length, differing];
}

function rankDifferences(value: PathbuilderImport, { ranks }: PioneerValues): [number, RankDiscrepancy[]] {
  const compared = Object.entries(RANKED_STATISTICS).flatMap(([key, selector]) => {
    const number = value.reported.proficiencies[key];
    const pathbuilder = number === undefined ? undefined : RANK_BY_NUMBER[number];
    const pioneer = ranks.get(selector);
    return pathbuilder === undefined || pioneer === undefined ? [] : [{ selector, pathbuilder, pioneer }];
  });
  const differing = compared
    .filter(({ pathbuilder, pioneer }) => pathbuilder !== pioneer)
    .map(({ selector, pathbuilder, pioneer }): RankDiscrepancy => ({
      kind: DiscrepancyKind.Rank,
      selector,
      pathbuilder,
      pioneer,
      difference: RANKS.indexOf(pioneer) - RANKS.indexOf(pathbuilder),
    }));
  return [compared.length, differing];
}

/**
 * The numbers Pathbuilder computed, beside the engine's for the imported character (#312): AC, maximum Hit Points,
 * Speed and the rank of each save, Perception, the class DC and the skills. Only a statistic both sides have is
 * compared, so one the engine can't derive yet (no content for it) counts as neither matching nor differing.
 */
export function discrepancyReport(value: PathbuilderImport, pioneer: PioneerValues): DiscrepancyReport {
  const [comparedTotals, totals] = totalDifferences(value, pioneer);
  const [comparedRanks, ranks] = rankDifferences(value, pioneer);
  return { compared: comparedTotals + comparedRanks, differences: [...totals, ...ranks] };
}
