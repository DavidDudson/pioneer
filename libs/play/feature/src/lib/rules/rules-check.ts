import {
  contentId,
  Domain,
  Origin,
  PackId,
  Predicate,
  RollOption,
  RuleElement,
  Selector,
  Slug,
  SourceRef,
} from '@pioneer/rules/sdk';
import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue, ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

/** The rules schemas the playground can check. */
export const RulesSchema = {
  Predicate: 'predicate',
  Selector: 'selector',
  Domain: 'domain',
  RollOption: 'roll-option',
  Source: 'source',
  Origin: 'origin',
  RuleElement: 'rule-element',
} as const;
export type RulesSchema = ValueOf<typeof RulesSchema>;

const SCHEMAS: Readonly<Record<RulesSchema, z.ZodType>> = {
  [RulesSchema.Predicate]: Predicate,
  [RulesSchema.Selector]: Selector,
  [RulesSchema.Domain]: Domain,
  [RulesSchema.RollOption]: RollOption,
  [RulesSchema.Source]: SourceRef,
  [RulesSchema.Origin]: Origin,
  [RulesSchema.RuleElement]: RuleElement,
};

/** Message keys for schema names, spelled out so the key check sees them. */
export const RULES_SCHEMA_KEYS: Readonly<Record<RulesSchema, string>> = {
  [RulesSchema.Predicate]: 'play.rules.schema.predicate',
  [RulesSchema.Selector]: 'play.rules.schema.selector',
  [RulesSchema.Domain]: 'play.rules.schema.domain',
  [RulesSchema.RollOption]: 'play.rules.schema.rollOption',
  [RulesSchema.Source]: 'play.rules.schema.source',
  [RulesSchema.Origin]: 'play.rules.schema.origin',
  [RulesSchema.RuleElement]: 'play.rules.schema.ruleElement',
};

const PLAYER_CORE = PackId.parse('player-core');
const playerCoreId = (slug: string): string => contentId(PLAYER_CORE, Slug.parse(slug));
const playerCorePage = { kind: 'book', book: 'player-core', page: 1 };
const JSON_INDENT = 2;
/** The level the example predicate tests for. */
const EXAMPLE_LEVEL = 5;
/** Raise a Shield's circumstance bonus to AC. */
const RAISED_SHIELD_BONUS = 2;

/** A valid starting value per schema, so the page opens on something that passes. */
const EXAMPLE_VALUES: Readonly<Record<RulesSchema, unknown>> = {
  [RulesSchema.Predicate]: [
    'self:condition:frightened',
    { or: ['action:seek', 'terrain:forest'] },
    { gte: ['self:level', EXAMPLE_LEVEL] },
  ],
  [RulesSchema.Selector]: 'save:fortitude',
  [RulesSchema.Domain]: 'skill-check',
  [RulesSchema.RollOption]: 'item:trait:agile',
  [RulesSchema.Source]: playerCorePage,
  [RulesSchema.Origin]: {
    hops: [
      { kind: 'choice', slot: 'class' },
      { kind: 'grant', by: playerCoreId('fighter'), rule: 0 },
    ],
    entry: playerCoreId('shield-block'),
    sources: [playerCorePage],
  },
  [RulesSchema.RuleElement]: {
    key: 'FlatModifier',
    selectors: ['ac'],
    type: 'circumstance',
    value: RAISED_SHIELD_BONUS,
    predicate: ['self:effect:raise-a-shield'],
  },
};

export function rulesExample(schema: RulesSchema): string {
  return JSON.stringify(EXAMPLE_VALUES[schema], undefined, JSON_INDENT);
}

export const CheckStatus = { Valid: 'valid', NotJson: 'not-json', Invalid: 'invalid' } as const;
export type CheckStatus = ValueOf<typeof CheckStatus>;

export type CheckOutcome =
  /** `parsed` is the validated value encoded back to JSON, as Pioneer would store or send it. */
  | { readonly status: typeof CheckStatus.Valid; readonly parsed: string }
  | { readonly status: typeof CheckStatus.NotJson }
  | { readonly status: typeof CheckStatus.Invalid; readonly issues: readonly FieldIssue[] };

type JsonParse = { readonly ok: true; readonly value: unknown } | { readonly ok: false };

function parseJson(text: string): JsonParse {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** Parse `text` as JSON, then validate it against `schema`. Never throws. */
export function checkRulesJson(schema: RulesSchema, text: string): CheckOutcome {
  const json = parseJson(text);
  if (!json.ok) {
    return { status: CheckStatus.NotJson };
  }
  const target = SCHEMAS[schema];
  const result = target.safeParse(json.value);
  return result.success
    ? { status: CheckStatus.Valid, parsed: JSON.stringify(z.encode(target, result.data), undefined, JSON_INDENT) }
    : { status: CheckStatus.Invalid, issues: fieldIssues(result.error.issues) };
}

/** A key that reads unambiguously after a dot; anything else is quoted in brackets. */
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

function formatSegment(segment: FieldIssue['path'][number], index: number): string {
  if (typeof segment === 'number') {
    return `[${segment}]`;
  }
  if (!IDENTIFIER.test(segment)) {
    return `[${JSON.stringify(segment)}]`;
  }
  return index === 0 ? segment : `.${segment}`;
}

/**
 * A path as it reads in JSON tooling: `[0].or[1].not`, with awkward keys quoted (`["a.b"]`, `[""]`).
 * Empty for the whole value.
 */
export function formatPath(path: FieldIssue['path']): string {
  return path.map((segment, index) => formatSegment(segment, index)).join('');
}
