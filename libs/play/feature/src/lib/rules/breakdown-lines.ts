import { LineStatusKind, ruleIdOf } from '@pioneer/rules/engine';
import type { BreakdownLine, RuleId, RuleInPlay } from '@pioneer/rules/engine';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import { contentId, ModifierType, Origin, PackId, RuleIndex, Slug } from '@pioneer/rules/sdk';
import type { RuleElement } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** Every rule element typed into the playground sits on one made-up entry, at its position in the array. */
const PLAYGROUND_ORIGIN = Origin.parse({
  hops: [],
  entry: contentId(PackId.parse('playground'), Slug.parse('rule-elements')),
  sources: [{ kind: 'book', book: 'player-core', page: 1 }],
});

/** The typed rule elements as rules in play, each at its index in the array. */
export function rulesInPlay(elements: readonly RuleElement[]): RuleInPlay[] {
  return elements.map((element, index) => ({ element, origin: PLAYGROUND_ORIGIN, rule: RuleIndex.parse(index) }));
}

/** How a line stands, with rule elements named by their 1-based number in the array. */
export type LineState =
  | { readonly kind: typeof LineStatusKind.Applied }
  | { readonly kind: typeof LineStatusKind.Suppressed; readonly by: number }
  | { readonly kind: typeof LineStatusKind.Conditional; readonly summary: PredicateSummary | undefined }
  | { readonly kind: typeof LineStatusKind.Inactive }
  | { readonly kind: typeof LineStatusKind.Failed; readonly error: MessageDescriptor };

/** One breakdown line as the playground shows it. */
export interface LineRow {
  /** The rule element's 1-based number in the array. */
  readonly rule: number;
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

/** Numbers the rules in play by their place in the typed array, for naming them in lines. */
export function ruleNumbers(rules: readonly RuleInPlay[]): ReadonlyMap<RuleId, number> {
  return new Map(rules.map((rule, index) => [ruleIdOf(rule), index + 1]));
}

function stateOf(line: BreakdownLine, numbers: ReadonlyMap<RuleId, number>): LineState {
  const { status } = line;
  switch (status.kind) {
    case LineStatusKind.Suppressed: {
      return { kind: status.kind, by: numbers.get(status.by) ?? 0 };
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

export function lineRow(line: BreakdownLine, numbers: ReadonlyMap<RuleId, number>): LineRow {
  const { modifier, value } = line;
  return {
    rule: numbers.get(modifier.id) ?? 0,
    label: 'text' in modifier.label ? modifier.label.text : undefined,
    type: modifier.type,
    value,
    state: stateOf(line, numbers),
  };
}
