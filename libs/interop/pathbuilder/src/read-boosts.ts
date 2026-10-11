import { BoostSource } from '@pioneer/character/domain';
import { AttributeSchema, Level } from '@pioneer/rules/sdk';
import type { Attribute } from '@pioneer/rules/sdk';

import type { PathbuilderBuild } from './pathbuilder-export';

/**
 * Attributes Pathbuilder boosted together, in export order: the ancestry's boosts (its own and any free ones, as one
 * set), the background's or class's at 1st level, or a free set. Gradual boosts taken between free levels join the
 * next free set.
 */
export interface ImportedBoosts {
  readonly source: BoostSource;
  readonly level: Level;
  readonly attributes: readonly Attribute[];
}

const FIRST_LEVEL = Level.parse(1);
/** Free boosts come every fifth level; a gradual boost below one belongs to its set. */
const FREE_BOOST_INTERVAL = 5;

/** Pathbuilder's attribute abbreviations ("Str", "Dex") as attributes; anything else is left out. */
function namedAttributes(names: readonly string[]): Attribute[] {
  return names.flatMap((name) => {
    const parsed = AttributeSchema.safeParse(name.trim().toLowerCase());
    return parsed.success ? [parsed.data] : [];
  });
}

/** The free set a boost taken at `level` belongs to: 1st level's, or the next fifth level's. */
function freeSetLevel(level: Level): Level {
  return level <= FIRST_LEVEL ? FIRST_LEVEL : Level.parse(Math.ceil(level / FREE_BOOST_INTERVAL) * FREE_BOOST_INTERVAL);
}

function freeBoosts(levelled: Readonly<Record<string, readonly string[]>>): ImportedBoosts[] {
  const levels = Object.entries(levelled)
    .flatMap(([key, names]) => {
      const level = Level.safeParse(Number(key));
      return level.success ? [{ level: level.data, names }] : [];
    })
    .toSorted((left, right) => left.level - right.level);
  const bySet = new Map<Level, Attribute[]>();
  for (const { level, names } of levels) {
    const set = freeSetLevel(level);
    bySet.set(set, [...(bySet.get(set) ?? []), ...namedAttributes(names)]);
  }
  return [...bySet].map(([level, attributes]) => ({ source: BoostSource.Free, level, attributes }));
}

/** The boosts Pathbuilder recorded, by set; none for an export without a breakdown. */
export function readBoosts(build: PathbuilderBuild): ImportedBoosts[] {
  const { breakdown } = build.abilities;
  if (breakdown === undefined) {
    return [];
  }
  const firstLevel: [BoostSource, readonly string[]][] = [
    [BoostSource.Ancestry, [...breakdown.ancestryBoosts, ...breakdown.ancestryFree]],
    [BoostSource.Background, breakdown.backgroundBoosts],
    [BoostSource.Class, breakdown.classBoosts],
  ];
  return [
    ...firstLevel.flatMap(([source, names]): ImportedBoosts[] => {
      const attributes = namedAttributes(names);
      return attributes.length === 0 ? [] : [{ source, level: FIRST_LEVEL, attributes }];
    }),
    ...freeBoosts(breakdown.mapLevelledBoosts),
  ];
}

/**
 * The attributes Pathbuilder flawed at 1st level, in export order: voluntary flaws, and possibly the ancestry's own.
 * None for an export without a breakdown.
 */
export function readFlaws(build: PathbuilderBuild): Attribute[] {
  return namedAttributes(build.abilities.breakdown?.ancestryFlaws ?? []);
}
