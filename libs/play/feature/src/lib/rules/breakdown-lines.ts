import { LineStatusKind, OverrideStatusKind, ruleIdOf } from '@pioneer/rules/engine';
import type { BreakdownLine, OverrideLine, RuleId, RuleInPlay } from '@pioneer/rules/engine';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import { contentId, ModifierType, Origin, OriginHopKind, PackId, RuleIndex, Slug } from '@pioneer/rules/sdk';
import type { ChangeMode, RuleElement } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

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
    entry: contentId(PLAYGROUND, Slug.parse('rule-elements')),
    sources: SOURCES,
  }),
  [RuleSource.Override]: Origin.parse({
    hops: [{ kind: 'override', by: '00000000-0000-4000-8000-000000000000', at: '2026-01-01T00:00:00.000Z' }],
    entry: contentId(PLAYGROUND, Slug.parse('overrides')),
    sources: SOURCES,
  }),
};

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

const UNKNOWN_RULE: RuleName = { source: RuleSource.Rule, number: 0 };

/** Message keys naming a rule element by its box, spelled out so the key check sees them. */
export const RULE_NAME_KEYS: Readonly<Record<RuleSource, string>> = {
  [RuleSource.Rule]: 'play.rules.ruleNumber',
  [RuleSource.Override]: 'play.rules.overrideNumber',
};

/** How a line stands, with rule elements named by box and number. */
export type LineState =
  | { readonly kind: typeof LineStatusKind.Applied }
  | { readonly kind: typeof LineStatusKind.Suppressed; readonly by: RuleName }
  | { readonly kind: typeof LineStatusKind.Conditional; readonly summary: PredicateSummary | undefined }
  | { readonly kind: typeof LineStatusKind.Inactive }
  | { readonly kind: typeof LineStatusKind.Failed; readonly error: MessageDescriptor };

/** One breakdown line as the playground shows it. */
export interface LineRow {
  readonly name: RuleName;
  /** Its `display.label`, if it has one. */
  readonly label: string | undefined;
  readonly type: ModifierType;
  readonly value: number | undefined;
  readonly state: LineState;
}

/** Message keys for each line state, spelled out so the key check sees them. */
export const LINE_STATE_KEYS: Readonly<Record<LineStatusKind, string>> = {
  [LineStatusKind.Applied]: 'play.rules.line.applied',
  [LineStatusKind.Suppressed]: 'play.rules.line.suppressed',
  [LineStatusKind.Conditional]: 'play.rules.line.conditional',
  [LineStatusKind.Inactive]: 'play.rules.line.inactive',
  [LineStatusKind.Failed]: 'play.rules.line.failed',
};

export const LINE_STATE_TONES = {
  [LineStatusKind.Applied]: 'success',
  [LineStatusKind.Suppressed]: 'neutral',
  [LineStatusKind.Conditional]: 'warning',
  [LineStatusKind.Inactive]: 'neutral',
  [LineStatusKind.Failed]: 'danger',
} as const satisfies Readonly<Record<LineStatusKind, string>>;

/** Message keys for modifier types. */
export const MODIFIER_TYPE_KEYS: Readonly<Record<ModifierType, string>> = {
  [ModifierType.Untyped]: 'play.rules.modifierType.untyped',
  [ModifierType.Status]: 'play.rules.modifierType.status',
  [ModifierType.Circumstance]: 'play.rules.modifierType.circumstance',
  [ModifierType.Item]: 'play.rules.modifierType.item',
  [ModifierType.Proficiency]: 'play.rules.modifierType.proficiency',
  [ModifierType.Attribute]: 'play.rules.modifierType.attribute',
  [ModifierType.Potency]: 'play.rules.modifierType.potency',
};

function stateOf(line: BreakdownLine, names: ReadonlyMap<RuleId, RuleName>): LineState {
  const { status } = line;
  switch (status.kind) {
    case LineStatusKind.Suppressed: {
      return { kind: status.kind, by: names.get(status.by) ?? UNKNOWN_RULE };
    }
    case LineStatusKind.Conditional: {
      return { kind: status.kind, summary: status.summary };
    }
    case LineStatusKind.Failed: {
      return { kind: status.kind, error: status.error };
    }
    case LineStatusKind.Applied:
    case LineStatusKind.Inactive: {
      return { kind: status.kind };
    }
    default: {
      return status satisfies never;
    }
  }
}

function labelText(label: BreakdownLine['modifier']['label']): string | undefined {
  return 'text' in label ? label.text : undefined;
}

export function lineRow(line: BreakdownLine, names: ReadonlyMap<RuleId, RuleName>): LineRow {
  const { modifier, value } = line;
  return {
    name: names.get(modifier.id) ?? UNKNOWN_RULE,
    label: labelText(modifier.label),
    type: modifier.type,
    value,
    state: stateOf(line, names),
  };
}

/** How an override line stands, with rule elements named by box and number. */
export type OverrideState =
  | { readonly kind: typeof OverrideStatusKind.Applied }
  | { readonly kind: typeof OverrideStatusKind.Replaced; readonly by: RuleName }
  | { readonly kind: typeof OverrideStatusKind.Conditional; readonly summary: PredicateSummary | undefined }
  | { readonly kind: typeof OverrideStatusKind.Inactive }
  | { readonly kind: typeof OverrideStatusKind.Failed; readonly error: MessageDescriptor };

/** One `Change` or set override as the playground shows it: what it did to which value. */
export interface OverrideRow {
  readonly name: RuleName;
  readonly label: string | undefined;
  readonly mode: ChangeMode;
  readonly replaced: number;
  readonly result: number;
  /** Whether a user set it by hand: an override hop in its origin. */
  readonly manual: boolean;
  readonly state: OverrideState;
}

export const OVERRIDE_STATE_KEYS: Readonly<Record<OverrideStatusKind, string>> = {
  [OverrideStatusKind.Applied]: 'play.rules.line.applied',
  [OverrideStatusKind.Replaced]: 'play.rules.line.replaced',
  [OverrideStatusKind.Conditional]: 'play.rules.line.conditional',
  [OverrideStatusKind.Inactive]: 'play.rules.line.inactive',
  [OverrideStatusKind.Failed]: 'play.rules.line.failed',
};

export const OVERRIDE_STATE_TONES = {
  [OverrideStatusKind.Applied]: 'success',
  [OverrideStatusKind.Replaced]: 'neutral',
  [OverrideStatusKind.Conditional]: 'warning',
  [OverrideStatusKind.Inactive]: 'neutral',
  [OverrideStatusKind.Failed]: 'danger',
} as const satisfies Readonly<Record<OverrideStatusKind, string>>;

function overrideStateOf(line: OverrideLine, names: ReadonlyMap<RuleId, RuleName>): OverrideState {
  const { status } = line;
  switch (status.kind) {
    case OverrideStatusKind.Replaced: {
      return { kind: status.kind, by: names.get(status.by) ?? UNKNOWN_RULE };
    }
    case OverrideStatusKind.Conditional: {
      return { kind: status.kind, summary: status.summary };
    }
    case OverrideStatusKind.Failed: {
      return { kind: status.kind, error: status.error };
    }
    case OverrideStatusKind.Applied:
    case OverrideStatusKind.Inactive: {
      return { kind: status.kind };
    }
    default: {
      return status satisfies never;
    }
  }
}

export function overrideRow(line: OverrideLine, names: ReadonlyMap<RuleId, RuleName>): OverrideRow {
  return {
    name: names.get(line.id) ?? UNKNOWN_RULE,
    label: labelText(line.label),
    mode: line.mode,
    replaced: line.replaced,
    result: line.result,
    manual: line.origin.hops.some(({ kind }) => kind === OriginHopKind.Override),
    state: overrideStateOf(line, names),
  };
}
