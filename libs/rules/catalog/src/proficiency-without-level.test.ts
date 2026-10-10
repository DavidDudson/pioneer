import { describe, expect, test } from 'bun:test';

import { BaseTermKind, deriveStatistics, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticResult } from '@pioneer/rules/engine';
import { ContentId, OriginHopKind, Proficiency, Selector } from '@pioneer/rules/sdk';
import type { Origin } from '@pioneer/rules/sdk';
import { assert, property } from 'fast-check';

import {
  AC_BASE,
  anyInputs,
  core,
  fighter,
  noFacts,
  PROFICIENCY_SELECTORS,
  PWL,
  RANK_BONUS,
  SKILLS,
  totals,
  withoutLevel,
} from './testing/core-rules';

/** GM Core's untrained modifier under Proficiency Without Level. */
const UNTRAINED_WITHOUT_LEVEL = -2;

const NO_FACTS = noFacts();

/** A proficiency bonus under the variant (GM Core): the rank's bonus without level, and -2 untrained. */
function bonusWithoutLevel(rank: Proficiency): number {
  return rank === Proficiency.Untrained ? UNTRAINED_WITHOUT_LEVEL : RANK_BONUS[rank];
}

/** How far the variant moves the fighter's statistic: untrained from +0 to -2, trained and up lose the level. */
function expectedShift(selector: string): number {
  const rank = fighter.ranks.get(Selector.parse(selector)) ?? Proficiency.Untrained;
  return rank === Proficiency.Untrained ? UNTRAINED_WITHOUT_LEVEL : -Number(fighter.level);
}

function difference(after: number | undefined, before: number | undefined): number | undefined {
  return after === undefined || before === undefined ? undefined : after - before;
}

/** The origin each term of a statistic's base carries, rounding lines left out. */
function termOrigins(
  results: ReadonlyMap<Selector, StatisticResult>,
  selector: string,
): readonly (Origin | undefined)[] {
  const result = results.get(Selector.parse(selector));
  const terms = result?.ok === true ? result.base : [];
  return terms.flatMap((term) => (term.kind === BaseTermKind.Term ? [term.origin] : []));
}

describe('Proficiency Without Level', () => {
  test('shifts every @prof statistic by the expected amount and names the variant on the @prof term', () => {
    const standard = totals(deriveStatistics(core, fighter));
    const variant = deriveStatistics(core, fighter, { rules: withoutLevel(), facts: NO_FACTS });
    const shifted = totals(variant);
    expect(PROFICIENCY_SELECTORS.map((selector) => difference(shifted[selector], standard[selector]))).toStrictEqual(
      PROFICIENCY_SELECTORS.map((selector) => expectedShift(selector)),
    );
    const variantHop = { kind: OriginHopKind.Variant, rule: ContentId.parse(PWL) };
    const origins = PROFICIENCY_SELECTORS.map((selector) => termOrigins(variant, selector));
    // The last term is @prof; the attribute (and AC's 10) carry no origin.
    expect(origins.map((terms) => terms.at(-1)?.hops)).toStrictEqual(PROFICIENCY_SELECTORS.map(() => [variantHop]));
    expect(origins.flatMap((terms) => terms.slice(0, -1)).every((origin) => origin === undefined)).toBe(true);
  });

  test('AC and the skills follow the GM Core table for any attributes and ranks', () => {
    const rules = withoutLevel();
    assert(
      property(anyInputs, ({ json, ac, dex, cap, skill }) => {
        const inputs = StatisticInputsJson.parse(json);
        const derived = totals(deriveStatistics(core, inputs, { rules, facts: NO_FACTS }));
        expect(derived['ac']).toBe(AC_BASE + Math.min(dex, cap) + bonusWithoutLevel(ac));
        for (const [slug, key] of Object.entries(SKILLS)) {
          expect(derived[`skill:${slug}`]).toBe(inputs.attributes.get(key) + bonusWithoutLevel(skill));
        }
      }),
    );
  });
});
