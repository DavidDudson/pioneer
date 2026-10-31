import { describe, expect, test } from 'bun:test';

import { Proficiency, Selector, SpellPreparation } from '@pioneer/rules/sdk';

import { DERIVED_TOTAL_STATISTICS } from './derived-totals';
import {
  ARMOR_CLASS,
  DiscrepancyKind,
  discrepancyReport,
  FOCUS_POINTS,
  LAND_SPEED,
  MAX_HIT_POINTS,
  RANKED_STATISTICS,
  SPELLCASTING,
} from './discrepancy-report';
import type { PioneerSpellSlots } from './discrepancy-report';
import mordredFixture from './fixtures/mordred.json';
import { readPathbuilderExport } from './read-pathbuilder-export';
import type { PathbuilderImport } from './read-pathbuilder-export';

const read = readPathbuilderExport(mordredFixture);
if (!read.ok) {
  throw new Error('The Mordred fixture should be readable');
}
const mordred: PathbuilderImport = read.value;

const RANK_BY_NUMBER = [Proficiency.Untrained, Proficiency.Trained, Proficiency.Expert, Proficiency.Master] as const;
const STEP = 2;
/** Mordred's class Hit Points, bonus per level and Constitution 14. */
const CLASS_HP = 10;
const HP_PER_LEVEL = 1;
const CON_MODIFIER = 2;
const TOTALS_COMPARED = 5 + DERIVED_TOTAL_STATISTICS.length;
const MORDRED_AC = 34;
/** 10 + Charisma 6 + expert 4 + level 12, from Mordred's divine focus. */
const MORDRED_SPELL_DC = 32;
const ORACLE_DC = Selector.parse('spell-dc:oracle');
/** Mordred's Oracle, which Pathbuilder gives these spells a day: five cantrips, then four of each rank 1 to 6. */
const ORACLE_ENTRY = { slug: 'oracle', preparation: SpellPreparation.Spontaneous, tradition: 'divine' } as const;
const ORACLE_PER_DAY = [5, 4, 4, 4, 4, 4, 4];
const ORACLE_THIRD_RANK = 3;
/** Mordred's five focus spells fill the pool to its most. */
const MORDRED_FOCUS_POINTS = 3;

/**
 * The totals Pathbuilder gives the saves, Perception, skills and class DC, worked by hand from Mordred (level 12,
 * Strength +4, Constitution +2, Wisdom +3): the attribute modifier, the rank's number, the level and the listed bonuses.
 */
const HAND_WORKED_TOTALS: readonly (readonly [string, number])[] = [
  ['perception', 3 + 4 + 12 + 1],
  ['save:fortitude', 2 + 6 + 12 + 1],
  ['skill:arcana', 1 + 2 + 12],
  ['skill:athletics', 4 + 6 + 12 + 1],
  ['skill:diplomacy', 6 + 6 + 12 + 3],
  ['class-dc', 10 + 4 + 2 + 12],
];

/** The values Pioneer derives, as maps the tests can change. */
interface Values {
  focusPoints: number | undefined;
  readonly totals: Map<Selector, number>;
  readonly ranks: Map<Selector, Proficiency>;
  spellSlots: PioneerSpellSlots[];
  readonly spellDcs: {
    selector: Selector;
    tradition: string;
    attribute: string;
    total: number;
  }[];
}

/** Pioneer's values as Pathbuilder reports them: no statistic differs. */
function agreeing(): Values {
  const unmatched = discrepancyReport(mordred, {
    focusPoints: undefined,
    spellSlots: [],
    spellDcs: [],
    ranks: new Map(),
    totals: new Map(
      DERIVED_TOTAL_STATISTICS.map((selector): [Selector, number] => [selector, Number.MIN_SAFE_INTEGER]),
    ),
  }).differences;
  const { acTotal, attributes, proficiencies } = mordred.reported;
  const perLevel = CLASS_HP + HP_PER_LEVEL + CON_MODIFIER;
  return {
    totals: new Map([
      [ARMOR_CLASS, acTotal?.acTotal ?? 0],
      [MAX_HIT_POINTS, (attributes?.ancestryhp ?? 0) + perLevel * mordred.level],
      [LAND_SPEED, attributes?.speed ?? 0],
      ...unmatched.map(({ selector, pathbuilder }): [Selector, number] => [selector, Number(pathbuilder)]),
    ]),
    spellSlots: [{ ...ORACLE_ENTRY, counts: ORACLE_PER_DAY }],
    focusPoints: MORDRED_FOCUS_POINTS,
    spellDcs: [
      {
        selector: Selector.parse('spell-dc:mortal-herald'),
        tradition: 'occult',
        attribute: 'cha',
        total: 1,
      },
      {
        selector: ORACLE_DC,
        tradition: 'divine',
        attribute: 'cha',
        total: MORDRED_SPELL_DC,
      },
    ],
    ranks: new Map(
      Object.entries(RANKED_STATISTICS).map(([key, selector]) => [
        selector,
        RANK_BY_NUMBER[(proficiencies[key] ?? 0) / STEP] ?? Proficiency.Untrained,
      ]),
    ),
  };
}

describe('discrepancyReport', () => {
  test('reports nothing when Pioneer derives what Pathbuilder computed', () => {
    const report = discrepancyReport(mordred, agreeing());
    expect(report.differences).toStrictEqual([]);
    expect(report.compared).toBe(TOTALS_COMPARED + ORACLE_PER_DAY.length + Object.keys(RANKED_STATISTICS).length);
  });

  test('derives the saves, Perception, skills and class DC from the export, listed bonuses included', () => {
    const values = agreeing();
    const wrong = new Map(HAND_WORKED_TOTALS.map(([selector]) => [Selector.parse(selector), 0] as const));
    for (const [selector, total] of wrong) {
      values.totals.set(selector, total);
    }
    const { differences } = discrepancyReport(mordred, values);
    expect(differences.map(({ selector, pathbuilder }) => `${selector}=${String(pathbuilder)}`)).toStrictEqual(
      HAND_WORKED_TOTALS.map(([selector, total]) => `${selector}=${String(total)}`),
    );
  });

  test('leaves a derived total the engine has none of out of the count', () => {
    const values = agreeing();
    values.totals.delete(Selector.parse('skill:athletics'));
    const report = discrepancyReport(mordred, values);
    expect(report.differences).toStrictEqual([]);
    expect(report.compared).toBe(TOTALS_COMPARED - 1 + ORACLE_PER_DAY.length + Object.keys(RANKED_STATISTICS).length);
  });

  test('names a total that differs, with Pioneer less Pathbuilder', () => {
    const values = agreeing();
    const ac = MORDRED_AC;
    values.totals.set(ARMOR_CLASS, ac - 2);
    const { differences } = discrepancyReport(mordred, values);
    expect(differences).toStrictEqual([
      {
        kind: DiscrepancyKind.Total,
        selector: ARMOR_CLASS,
        pathbuilder: ac,
        pioneer: ac - 2,
        difference: -2,
      },
    ]);
  });

  test('names a focus pool that differs, and compares none for a character without a focus entry', () => {
    const values = agreeing();
    values.focusPoints = 1;
    const { differences } = discrepancyReport(mordred, values);
    expect(differences).toStrictEqual([
      {
        kind: DiscrepancyKind.Total,
        selector: FOCUS_POINTS,
        pathbuilder: MORDRED_FOCUS_POINTS,
        pioneer: 1,
        difference: 1 - MORDRED_FOCUS_POINTS,
      },
    ]);
    values.focusPoints = undefined;
    expect(discrepancyReport(mordred, values).compared).toBe(
      TOTALS_COMPARED - 1 + ORACLE_PER_DAY.length + Object.keys(RANKED_STATISTICS).length,
    );
  });

  test('names a spell DC that differs, for the engine entry with the focus tradition and attribute', () => {
    const agree = agreeing();
    const values: Values = {
      ...agree,
      spellDcs: [
        ...agree.spellDcs.filter(({ selector }) => selector !== ORACLE_DC),
        { selector: ORACLE_DC, tradition: 'divine', attribute: 'cha', total: MORDRED_SPELL_DC + 1 },
      ],
    };
    const { differences } = discrepancyReport(mordred, values);
    expect(differences).toStrictEqual([
      {
        kind: DiscrepancyKind.Total,
        selector: ORACLE_DC,
        pathbuilder: MORDRED_SPELL_DC,
        pioneer: MORDRED_SPELL_DC + 1,
        difference: 1,
      },
    ]);
  });

  test('names a rank that differs, with the steps between them', () => {
    const values = agreeing();
    const will = Selector.parse('save:will');
    values.ranks.set(will, Proficiency.Trained);
    const { differences } = discrepancyReport(mordred, values);
    expect(differences).toStrictEqual([
      {
        kind: DiscrepancyKind.Rank,
        selector: will,
        pathbuilder: Proficiency.Master,
        pioneer: Proficiency.Trained,
        difference: -2,
      },
    ]);
  });

  test('names an armor or weapon category rank that differs', () => {
    const values = agreeing();
    const light = Selector.parse('defense:light');
    values.ranks.set(light, Proficiency.Master);
    const { differences } = discrepancyReport(mordred, values);
    expect(differences).toStrictEqual([
      {
        kind: DiscrepancyKind.Rank,
        selector: light,
        pathbuilder: Proficiency.Expert,
        pioneer: Proficiency.Master,
        difference: 1,
      },
    ]);
  });

  test('compares the one spellcasting rank with the highest Pathbuilder gives in a tradition with an entry', () => {
    const values = agreeing();
    values.ranks.set(SPELLCASTING, Proficiency.Expert);
    expect(discrepancyReport(mordred, values).differences).toStrictEqual([]);
    values.ranks.set(SPELLCASTING, Proficiency.Trained);
    expect(discrepancyReport(mordred, values).differences).toStrictEqual([
      {
        kind: DiscrepancyKind.Rank,
        selector: SPELLCASTING,
        pathbuilder: Proficiency.Expert,
        pioneer: Proficiency.Trained,
        difference: -1,
      },
    ]);
  });

  test('names the ranks of spell slots that differ for the entry that casts the way the caster does', () => {
    const values = agreeing();
    values.spellSlots = [{ ...ORACLE_ENTRY, counts: ORACLE_PER_DAY.with(ORACLE_THIRD_RANK, 3) }];
    const { differences } = discrepancyReport(mordred, values);
    expect(differences).toStrictEqual([
      {
        kind: DiscrepancyKind.Total,
        selector: Selector.parse('spell-slots:oracle:3'),
        pathbuilder: 4,
        pioneer: 3,
        difference: -1,
      },
    ]);
  });

  test('compares the cantrips, and slots Pioneer lacks entirely, but not a rank neither side has', () => {
    const values = agreeing();
    values.spellSlots = [{ ...ORACLE_ENTRY, counts: [4, 4] }];
    const selectors = discrepancyReport(mordred, values).differences.map(({ selector }) => selector);
    expect(selectors).toStrictEqual(
      ['cantrip', '2', '3', '4', '5', '6'].map((rank) => Selector.parse(`spell-slots:oracle:${rank}`)),
    );
  });

  test('has nothing to compare for a caster with no entry that casts the way it does', () => {
    const values = agreeing();
    values.spellSlots = [{ ...ORACLE_ENTRY, preparation: SpellPreparation.Prepared, counts: [] }];
    expect(discrepancyReport(mordred, values).differences).toStrictEqual([]);
  });

  test('leaves out a statistic Pioneer cannot derive', () => {
    const report = discrepancyReport(mordred, {
      totals: new Map(),
      ranks: new Map(),
      spellDcs: [],
      spellSlots: [],
      focusPoints: undefined,
    });
    expect(report).toStrictEqual({ compared: 0, differences: [] });
  });
});
