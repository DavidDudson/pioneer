import { ruleIdOf } from '@pioneer/rules/engine';
import type { RuleId, RuleInPlay } from '@pioneer/rules/engine';
import { contentId, EntrySlug, Origin, PackId, RuleIndex } from '@pioneer/rules/sdk';
import type { RuleElement } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** Where a typed rule element came from: the rule elements box, or the overrides box. */
export const RuleSource = { Rule: 'rule', Override: 'override' } as const;
export type RuleSource = ValueOf<typeof RuleSource>;

/** A typed rule element as the playground names it: its box and its 1-based number there. */
export interface RuleName {
  readonly source: RuleSource;
  readonly number: number;
}

const PLAYGROUND = PackId.parse('playground');
const SOURCES = [{ kind: 'book', book: 'player-core', page: 1 }];

/**
 * Every typed rule element sits on a made-up entry per box, at its position in the array. Overrides have an
 * `override` hop: set by a playground user at a fixed time, since the playground has neither accounts nor a clock.
 */
const ORIGINS: Readonly<Record<RuleSource, Origin>> = {
  [RuleSource.Rule]: Origin.parse({
    hops: [],
    entry: contentId(PLAYGROUND, EntrySlug.parse('effect:rule-elements')),
    sources: SOURCES,
  }),
  [RuleSource.Override]: Origin.parse({
    hops: [{ kind: 'override', by: '00000000-0000-4000-8000-000000000000', at: '2026-01-01T00:00:00.000Z' }],
    entry: contentId(PLAYGROUND, EntrySlug.parse('effect:overrides')),
    sources: SOURCES,
  }),
};

/** A weapon in the example inputs, on a made-up playground entry of its slug, as the inventory will supply it. */
export function weaponOrigin(slug: string): Origin {
  return Origin.parse({ hops: [], entry: contentId(PLAYGROUND, EntrySlug.parse(`weapon:${slug}`)), sources: SOURCES });
}

/** The typed rule elements from one box as rules in play, each at its index in the array. */
export function rulesInPlay(elements: readonly RuleElement[], source: RuleSource): RuleInPlay[] {
  return elements.map((element, index) => ({ element, origin: ORIGINS[source], rule: RuleIndex.parse(index) }));
}

function sourceOf(rule: RuleInPlay): RuleSource {
  return rule.origin.entry === ORIGINS[RuleSource.Override].entry ? RuleSource.Override : RuleSource.Rule;
}

/** Names every rule in play by its box and its place in the typed array, for naming them in lines. */
export function ruleNames(rules: readonly RuleInPlay[]): ReadonlyMap<RuleId, RuleName> {
  return new Map(rules.map((rule) => [ruleIdOf(rule), { source: sourceOf(rule), number: rule.rule + 1 }]));
}

/** Message keys naming a rule element by its box, spelled out so the key check sees them. */
export const RULE_NAME_KEYS: Readonly<Record<RuleSource, string>> = {
  [RuleSource.Rule]: 'play.rules.ruleNumber',
  [RuleSource.Override]: 'play.rules.overrideNumber',
};
