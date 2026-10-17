import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  contentId,
  EntrySlug,
  PackId,
  RollOption,
  Selector,
  StatisticDefinition,
  StatisticKind,
} from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { deriveStatistics } from '../derive-statistics';
import type { RuleInPlay } from '../rule-in-play';
import { StatisticInputsJson } from '../statistic-inputs';
import type { StatisticResult, StatisticValue } from '../statistic-result';
import { inPlay } from './builders';

interface Spec {
  readonly selector: string;
  readonly base: string;
  readonly kind: StatisticKind;
  readonly domains?: readonly string[];
}

function definition({ selector, base, kind, domains = [] }: Spec): StatisticDefinition {
  return StatisticDefinition.parse({
    slug: `statistic:${selector.replaceAll(':', '-')}`,
    name: selector,
    selector,
    domains,
    base,
    kind,
  });
}

const BREASTPLATE = contentId(PackId.parse('engine-test'), EntrySlug.parse('armor:breastplate'));
const ARMOR_ORIGIN = {
  hops: [{ kind: 'inventory', item: '44444444-4444-4444-8444-444444444444', state: 'worn' }],
  entry: BREASTPLATE,
  sources: [{ kind: 'book', book: 'player-core', page: 1 }],
};

/** Level 3, Strength +1, Dexterity +2, in a breastplate: +4 to AC and a check penalty of 2. */
export const FORM_INPUTS = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 1, dex: 2, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
  armor: { bonus: 4, checkPenalty: 2, origin: ARMOR_ORIGIN },
});

/** The roll option the forms in the tests are predicated on is on. */
export const FORM_FACTS = new PredicateFacts([RollOption.parse('form:plant')], CORE_NAMESPACES);

/** AC 10 + 3 + 2 + 4 for the breastplate. */
export const OWN_AC = 19;

const CONTENT = {
  definitions: [
    definition({ selector: 'ac', base: '10 + @level + @attr.dex', kind: StatisticKind.Dc }),
    definition({ selector: 'skill:athletics', base: '@attr.str', kind: StatisticKind.Check, domains: ['skill-check'] }),
    definition({
      selector: 'skill:acrobatics',
      base: '@attr.dex',
      kind: StatisticKind.Check,
      domains: ['skill-check'],
    }),
    definition({ selector: 'speed:land', base: '25', kind: StatisticKind.Value }),
    definition({ selector: 'speed:fly', base: '0', kind: StatisticKind.Value }),
  ],
  proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS,
};

/** A `BattleForm` with `body` as its form, on the entry `plant-form`. */
export function formRule(body: object, extra: object = {}): RuleInPlay {
  return inPlay({ key: 'BattleForm', form: body, ...extra }, 'plant-form');
}

/** One statistic derived with `rules` in play. */
export function derived(rules: readonly RuleInPlay[], selector: string): StatisticResult | undefined {
  return deriveStatistics(CONTENT, FORM_INPUTS, { rules, facts: FORM_FACTS }).get(Selector.parse(selector));
}

/** One statistic that has a value, derived with `rules` in play. */
export function valued(rules: readonly RuleInPlay[], selector: string): StatisticValue {
  const result = derived(rules, selector);
  if (result === undefined || !result.ok) {
    throw new Error(`expected ${selector} to have a value`);
  }
  return result;
}

/** The total of one statistic, as a plain number. */
export function totalOf(rules: readonly RuleInPlay[], selector: string): number {
  const { total }: { total: number } = valued(rules, selector);
  return total;
}
