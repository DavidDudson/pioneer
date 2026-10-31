import { Attribute, AttributeSchema, Selector } from '@pioneer/rules/sdk';

import type { PathbuilderImport } from './read-pathbuilder-export';

/** A statistic Pathbuilder gives a rank for, and the attribute its total adds, by its key in `proficiencies`. */
interface Derivable {
  readonly key: string;
  readonly selector: Selector;
  readonly attribute: Attribute;
}

const derivable = (key: string, selector: string, attribute: Attribute): Derivable => ({
  key,
  selector: Selector.parse(selector),
  attribute,
});

const skill = (name: string, attribute: Attribute): Derivable => derivable(name, `skill:${name}`, attribute);

const DERIVABLE: readonly Derivable[] = [
  derivable('perception', 'perception', Attribute.Wisdom),
  derivable('fortitude', 'save:fortitude', Attribute.Constitution),
  derivable('reflex', 'save:reflex', Attribute.Dexterity),
  derivable('will', 'save:will', Attribute.Wisdom),
  skill('acrobatics', Attribute.Dexterity),
  skill('arcana', Attribute.Intelligence),
  skill('athletics', Attribute.Strength),
  skill('crafting', Attribute.Intelligence),
  skill('deception', Attribute.Charisma),
  skill('diplomacy', Attribute.Charisma),
  skill('intimidation', Attribute.Charisma),
  skill('medicine', Attribute.Wisdom),
  skill('nature', Attribute.Wisdom),
  skill('occultism', Attribute.Intelligence),
  skill('performance', Attribute.Charisma),
  skill('religion', Attribute.Wisdom),
  skill('society', Attribute.Intelligence),
  skill('stealth', Attribute.Dexterity),
  skill('survival', Attribute.Wisdom),
  skill('thievery', Attribute.Dexterity),
];

const CLASS_DC_KEY = 'classDC';
const CLASS_DC = Selector.parse('class-dc');
/** The base of a DC. */
const BASE_DC = 10;
/** The type Pathbuilder gives a bonus with no type, which stacks. */
const UNTYPED = 'untyped';

/** The statistics Pathbuilder's rank, attribute and level give a total for: saves, Perception, skills and the class DC. */
export const DERIVED_TOTAL_STATISTICS: readonly Selector[] = [...DERIVABLE.map(({ selector }) => selector), CLASS_DC];

/**
 * The bonuses Pathbuilder lists for a statistic. Those of one type don't stack, so the best bonus (or worst penalty)
 * of each type counts; untyped ones all do.
 */
function modsTotal(value: PathbuilderImport, key: string): number {
  const name = key.toLowerCase();
  const listed = Object.entries(value.reported.mods)
    .filter(([statistic]) => statistic.toLowerCase() === name)
    .flatMap(([, byType]) => Object.entries(byType));
  const untyped = listed.filter(([type]) => type.toLowerCase().startsWith(UNTYPED));
  const typed = Map.groupBy(
    listed.filter(([type]) => !type.toLowerCase().startsWith(UNTYPED)),
    ([type]) => type,
  );
  const bonuses = [...typed.values()].map((group) => {
    const amounts = group.map(([, amount]) => amount);
    return Math.max(...amounts) > 0 ? Math.max(...amounts) : Math.min(...amounts);
  });
  return [...untyped.map(([, amount]) => amount), ...bonuses].reduce((sum, amount) => sum + amount, 0);
}

/** A total from a fixed part, the rank's number plus the level when trained or better, and the listed bonuses. */
function total(value: PathbuilderImport, key: string, fixed: number): number | undefined {
  const rank = value.reported.proficiencies[key];
  return rank === undefined ? undefined : fixed + rank + (rank > 0 ? value.level : 0) + modsTotal(value, key);
}

/**
 * The totals Pathbuilder's export gives the saves, Perception, skills and class DC (10 and the key attribute),
 * worked from the ranks, attributes, level and listed bonuses it reports. One without a rank has none.
 */
export function derivedTotals(value: PathbuilderImport): [Selector, number][] {
  const keyAttribute = AttributeSchema.safeParse(value.reported.keyability).data;
  const all: [Selector, number | undefined][] = [
    ...DERIVABLE.map(({ key, selector, attribute }): [Selector, number | undefined] => [
      selector,
      total(value, key, value.attributes.get(attribute)),
    ]),
    [
      CLASS_DC,
      keyAttribute === undefined ? undefined : total(value, CLASS_DC_KEY, BASE_DC + value.attributes.get(keyAttribute)),
    ],
  ];
  return all.flatMap(([selector, amount]): [Selector, number][] => (amount === undefined ? [] : [[selector, amount]]));
}
