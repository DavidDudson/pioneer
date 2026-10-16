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

/** Armor and weapon categories, under one name in Pathbuilder and the engine. */
const DEFENSES: readonly string[] = ['unarmored', 'light', 'medium', 'heavy'];
const ATTACKS: readonly string[] = ['unarmed', 'simple', 'martial', 'advanced'];

/** Pathbuilder's key in `proficiencies` and the selector it ranks. */
type RankedKey = readonly [string, string];

const RANKED_KEYS: readonly RankedKey[] = [
  ['perception', 'perception'],
  ['fortitude', 'save:fortitude'],
  ['reflex', 'save:reflex'],
  ['will', 'save:will'],
  ['classDC', 'class-dc'],
  ...DEFENSES.map((category): RankedKey => [category, `defense:${category}`]),
  ...ATTACKS.map((category): RankedKey => [category, `attack:${category}`]),
  ...SKILLS.map((skill): RankedKey => [skill, `skill:${skill}`]),
];

/** The statistics whose rank Pathbuilder gives, by the key it uses in `proficiencies`. */
export const RANKED_STATISTICS: Readonly<Record<string, Selector>> = Object.fromEntries(
  RANKED_KEYS.map(([key, selector]): [string, Selector] => [key, Selector.parse(selector)]),
);

/** The one rank every spellcasting entry reads. */
export const SPELLCASTING = Selector.parse('spellcasting');

/** Pathbuilder's key in `proficiencies` for the rank of each tradition. */
const CASTING_KEYS: Readonly<Record<string, string>> = {
  arcane: 'castingArcane',
  divine: 'castingDivine',
  occult: 'castingOccult',
  primal: 'castingPrimal',
};

export const ARMOR_CLASS = Selector.parse('ac');
export const MAX_HIT_POINTS = Selector.parse('hp:max');
export const LAND_SPEED = Selector.parse('speed');

/** The spell DC the engine derived for one of the character's spellcasting entries. */
export interface PioneerSpellDc {
  /** The entry's `spell-dc:<slug>`. */
  readonly selector: Selector;
  readonly tradition: string;
  readonly attribute: string;
  readonly total: number;
}

/** What the engine derived for the imported character: totals by statistic, ranks of the statistics ranked, and the spell DCs. */
export interface PioneerValues {
  readonly totals: ReadonlyMap<Selector, number>;
  readonly ranks: ReadonlyMap<Selector, Proficiency>;
  readonly spellDcs: readonly PioneerSpellDc[];
}

/** The base of a DC. */
const BASE_DC = 10;

/** A total Pathbuilder computed and the engine's for the same statistic. */
interface Pair {
  readonly selector: Selector;
  readonly pathbuilder: number;
  readonly pioneer: number;
}

/** A rank Pathbuilder gives and the engine's for the same statistic. */
interface RankPair {
  readonly selector: Selector;
  readonly pathbuilder: Proficiency;
  readonly pioneer: Proficiency;
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

/** A focus entry's DC: 10, its attribute and item bonuses, and its rank's number plus the level when trained or better. */
function focusDc(level: number, entry: { abilityBonus?: number; proficiency?: number; itemBonus?: number }): number {
  const rank = entry.proficiency ?? 0;
  return BASE_DC + (entry.abilityBonus ?? 0) + rank + (entry.itemBonus ?? 0) + (rank > 0 ? level : 0);
}

/**
 * The spell DC Pathbuilder computed for each focus tradition and attribute, beside the engine's for the first of its
 * entries with that tradition and attribute. One with no such entry (a focus-only caster the engine gives none) is left out.
 */
function spellDcPairs(value: PathbuilderImport, { spellDcs }: PioneerValues): Pair[] {
  return Object.entries(value.reported.focus).flatMap(([tradition, byAttribute]) =>
    Object.entries(byAttribute).flatMap(([attribute, entry]) => {
      const pioneer = spellDcs.find((dc) => dc.tradition === tradition && dc.attribute === attribute);
      return pioneer === undefined
        ? []
        : [
            {
              selector: pioneer.selector,
              pathbuilder: focusDc(value.level, entry),
              pioneer: pioneer.total,
            },
          ];
    }),
  );
}

function totalDifferences(value: PathbuilderImport, values: PioneerValues): [number, TotalDiscrepancy[]] {
  const compared: Pair[] = [
    ...[...reportedTotals(value)].flatMap(([selector, pathbuilder]): Pair[] => {
      const pioneer = values.totals.get(selector);
      return pioneer === undefined ? [] : [{ selector, pathbuilder, pioneer }];
    }),
    ...spellDcPairs(value, values),
  ];
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

/**
 * The highest rank Pathbuilder gives in a tradition the engine has a spellcasting entry for, beside the one
 * `spellcasting` rank the engine reads for them all. Nothing without an entry or a rank on either side.
 */
function castingRankPairs(value: PathbuilderImport, { ranks, spellDcs }: PioneerValues): RankPair[] {
  const pioneer = ranks.get(SPELLCASTING);
  const traditions = [...new Set(spellDcs.map(({ tradition }) => tradition))];
  const given = traditions.flatMap((tradition): Proficiency[] => {
    const number = value.reported.proficiencies[CASTING_KEYS[tradition] ?? ''];
    const rank = number === undefined ? undefined : RANK_BY_NUMBER[number];
    return rank === undefined ? [] : [rank];
  });
  const [pathbuilder] = given.toSorted((first, second) => RANKS.indexOf(second) - RANKS.indexOf(first));
  return pathbuilder === undefined || pioneer === undefined ? [] : [{ selector: SPELLCASTING, pathbuilder, pioneer }];
}

function rankDifferences(value: PathbuilderImport, values: PioneerValues): [number, RankDiscrepancy[]] {
  const compared: RankPair[] = [
    ...Object.entries(RANKED_STATISTICS).flatMap(([key, selector]): RankPair[] => {
      const number = value.reported.proficiencies[key];
      const pathbuilder = number === undefined ? undefined : RANK_BY_NUMBER[number];
      const pioneer = values.ranks.get(selector);
      return pathbuilder === undefined || pioneer === undefined ? [] : [{ selector, pathbuilder, pioneer }];
    }),
    ...castingRankPairs(value, values),
  ];
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
 * Speed, the spell DC of each focus tradition and the rank of each save, Perception, the class DC and the skills. Only a statistic both sides have is
 * compared, so one the engine can't derive yet (no content for it) counts as neither matching nor differing.
 */
export function discrepancyReport(value: PathbuilderImport, pioneer: PioneerValues): DiscrepancyReport {
  const [comparedTotals, totals] = totalDifferences(value, pioneer);
  const [comparedRanks, ranks] = rankDifferences(value, pioneer);
  return {
    compared: comparedTotals + comparedRanks,
    differences: [...totals, ...ranks],
  };
}
