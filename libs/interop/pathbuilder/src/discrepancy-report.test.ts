import { describe, expect, test } from 'bun:test';

import { Proficiency, Selector } from '@pioneer/rules/sdk';

import {
  ARMOR_CLASS,
  DiscrepancyKind,
  discrepancyReport,
  LAND_SPEED,
  MAX_HIT_POINTS,
  RANKED_STATISTICS,
} from './discrepancy-report';
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
const TOTALS_COMPARED = 3;
const MORDRED_AC = 34;

/** The values Pioneer derives, as maps the tests can change. */
interface Values {
  readonly totals: Map<Selector, number>;
  readonly ranks: Map<Selector, Proficiency>;
}

/** Pioneer's values as Pathbuilder reports them: no statistic differs. */
function agreeing(): Values {
  const { acTotal, attributes, proficiencies } = mordred.reported;
  const perLevel = CLASS_HP + HP_PER_LEVEL + CON_MODIFIER;
  return {
    totals: new Map([
      [ARMOR_CLASS, acTotal?.acTotal ?? 0],
      [MAX_HIT_POINTS, (attributes?.ancestryhp ?? 0) + perLevel * mordred.level],
      [LAND_SPEED, attributes?.speed ?? 0],
    ]),
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
    expect(report.compared).toBe(TOTALS_COMPARED + Object.keys(RANKED_STATISTICS).length);
  });

  test('names a total that differs, with Pioneer less Pathbuilder', () => {
    const values = agreeing();
    const ac = MORDRED_AC;
    values.totals.set(ARMOR_CLASS, ac - 2);
    const { differences } = discrepancyReport(mordred, values);
    expect(differences).toStrictEqual([
      { kind: DiscrepancyKind.Total, selector: ARMOR_CLASS, pathbuilder: ac, pioneer: ac - 2, difference: -2 },
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

  test('leaves out a statistic Pioneer cannot derive', () => {
    const report = discrepancyReport(mordred, { totals: new Map(), ranks: new Map() });
    expect(report).toStrictEqual({ compared: 0, differences: [] });
  });
});
