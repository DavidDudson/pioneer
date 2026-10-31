import { expect } from 'bun:test';

import { deriveStatistics, LineStatusKind } from '@pioneer/rules/engine';
import type { RuleInPlay, StatisticContent, StatisticResult } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantInputs, GrantResolution } from '@pioneer/rules/grants';
import { FIGHTER_CONTENT, inputsOf, LEVEL_20_PICKS, picked, picksOf } from '@pioneer/rules/grants/testing';
import { Attribute, ContentLicense, ContentPack, Selector, StatisticKind } from '@pioneer/rules/sdk';
import { benchmark } from '@pioneer/shared/bench';

import { contentOf, core, coreRules, withoutLevel } from './testing/core-rules';
import { coreNamespaces, level20Fighter, level20FighterRules, LEVEL_20_SITUATION } from './testing/fighter';

/** The budget rules-engine.md sets: a full derivation of a level 20 character in under 10 ms, so the builder can re-derive per keystroke. */
const BUDGET_MS = 10;

/** A homebrew pack that restates Perception, as a house rule would, so a later pack replaces a core statistic. */
const houseRules = ContentPack.define({
  manifest: { id: 'house-rules', title: 'House rules', publisher: 'Pioneer', license: ContentLicense.Homebrew },
  ancestries: [],
  creatures: [],
  statistics: [
    {
      slug: 'statistic:keen-perception',
      name: 'Keen Perception',
      selector: 'perception',
      domains: ['check', 'wis-based'],
      base: '@attr.wis + @prof.perception + 1',
      kind: StatisticKind.Check,
      keyAttribute: Attribute.Wisdom,
      sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    },
  ],
});

/** Built once: the table is content, loaded with the pack, not part of a derivation. */
const namespaces = coreNamespaces();

/** The golden Fighter at 20th level with every slot picked, in the bench's situation, read through the core table. */
function grantInputs(): GrantInputs {
  const inputs = inputsOf({
    entries: FIGHTER_CONTENT,
    roots: [picked('fighter', 'class')],
    level: 20,
    situation: LEVEL_20_SITUATION,
    picks: picksOf(LEVEL_20_PICKS),
  });
  return { ...inputs, namespaces };
}

/** What one derivation produced: the grant resolution, and every statistic its facts let derive. */
interface Derivation {
  readonly grants: GrantResolution;
  readonly statistics: ReadonlyMap<Selector, StatisticResult>;
}

/** What a derivation is given, built before the timer starts as the app builds it once per content load or edit. */
interface Given {
  readonly content: StatisticContent;
  readonly grantInputs: GrantInputs;
  readonly rules: readonly RuleInPlay[];
}

function given(content: StatisticContent, extra: readonly RuleInPlay[] = []): Given {
  return { content, grantInputs: grantInputs(), rules: [...level20FighterRules, ...extra] };
}

/** A whole derivation: grants to a fixpoint, then every statistic, its predicates read against the grants' facts. */
function derive({ content, grantInputs: inputs, rules }: Given): Derivation {
  const grants = resolveGrants(inputs);
  return { grants, statistics: deriveStatistics(content, level20Fighter, { rules, facts: grants.facts }) };
}

/** Every status a breakdown line ends in, so the load is known to exercise stacking, predicates and conditions. */
function lineStatuses(statistics: ReadonlyMap<Selector, StatisticResult>): readonly LineStatusKind[] {
  const kinds = [...statistics.values()].flatMap((result) =>
    result.ok ? result.lines.map(({ status }) => status.kind) : [],
  );
  return [...new Set(kinds)].toSorted();
}

function failed(statistics: ReadonlyMap<Selector, StatisticResult>): readonly Selector[] {
  return [...statistics].flatMap(([selector, result]) => (result.ok ? [] : [selector]));
}

const standard = given(core);
const { grants, statistics } = derive(standard);
expect(grants.errors).toEqual([]);
expect(grants.answered).toHaveLength(LEVEL_20_PICKS.length);
expect(failed(statistics)).toEqual([]);
expect(statistics.has(Selector.parse('strike:shortbow'))).toBe(true);
expect(lineStatuses(statistics)).toStrictEqual([
  LineStatusKind.Applied,
  LineStatusKind.Conditional,
  LineStatusKind.Inactive,
  LineStatusKind.Suppressed,
]);
benchmark({
  name: 'catalog: level 20 Fighter derives grants and every statistic',
  budgetMs: BUDGET_MS,
  prepare: () => standard,
  run: derive,
});

const variant = given(contentOf(coreRules, houseRules), withoutLevel());
const variantDerivation = derive(variant);
expect(failed(variantDerivation.statistics)).toEqual([]);
// Wisdom +3, master without level +6, and the house rule's +1.
expect(variantDerivation.statistics.get(Selector.parse('perception'))).toMatchObject({ ok: true, formulaValue: 10 });
benchmark({
  name: 'catalog: level 20 Fighter with Proficiency Without Level and a homebrew pack restating Perception',
  budgetMs: BUDGET_MS,
  prepare: () => variant,
  run: derive,
});
