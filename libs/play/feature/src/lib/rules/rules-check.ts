import {
  contentId,
  Domain,
  Origin,
  PackId,
  Predicate,
  RollOption,
  Selector,
  Slug,
  SourceRef,
} from '@pioneer/rules/sdk';
import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue, ValueOf } from '@pioneer/shared/kernel';
import type { z } from 'zod';

/** The rules schemas the playground can check. */
export const RulesSchema = {
  Predicate: 'predicate',
  Selector: 'selector',
  Domain: 'domain',
  RollOption: 'roll-option',
  Source: 'source',
  Origin: 'origin',
} as const;
export type RulesSchema = ValueOf<typeof RulesSchema>;

const SCHEMAS: Readonly<Record<RulesSchema, z.ZodType>> = {
  [RulesSchema.Predicate]: Predicate,
  [RulesSchema.Selector]: Selector,
  [RulesSchema.Domain]: Domain,
  [RulesSchema.RollOption]: RollOption,
  [RulesSchema.Source]: SourceRef,
  [RulesSchema.Origin]: Origin,
};

/** Message keys for schema names, spelled out so the key check sees them. */
export const RULES_SCHEMA_KEYS: Readonly<Record<RulesSchema, string>> = {
  [RulesSchema.Predicate]: 'play.rules.schema.predicate',
  [RulesSchema.Selector]: 'play.rules.schema.selector',
  [RulesSchema.Domain]: 'play.rules.schema.domain',
  [RulesSchema.RollOption]: 'play.rules.schema.rollOption',
  [RulesSchema.Source]: 'play.rules.schema.source',
  [RulesSchema.Origin]: 'play.rules.schema.origin',
};

const PLAYER_CORE = PackId.parse('player-core');
const playerCoreId = (slug: string): string => contentId(PLAYER_CORE, Slug.parse(slug));
const playerCorePage = { kind: 'book', book: 'player-core', page: 1 };
const JSON_INDENT = 2;
/** The level the example predicate tests for. */
const EXAMPLE_LEVEL = 5;

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
};

export function rulesExample(schema: RulesSchema): string {
  return JSON.stringify(EXAMPLE_VALUES[schema], undefined, JSON_INDENT);
}

export const CheckStatus = { Valid: 'valid', NotJson: 'not-json', Invalid: 'invalid' } as const;
export type CheckStatus = ValueOf<typeof CheckStatus>;

export type CheckOutcome =
  | { readonly status: typeof CheckStatus.Valid }
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
  const result = SCHEMAS[schema].safeParse(json.value);
  return result.success
    ? { status: CheckStatus.Valid }
    : { status: CheckStatus.Invalid, issues: fieldIssues(result.error.issues) };
}

/** A path as it reads in JSON tooling: `[0].or[1].not`. Empty for the whole value. */
export function formatPath(path: FieldIssue['path']): string {
  return path
    .map((segment, index) => {
      if (typeof segment === 'number') {
        return `[${segment}]`;
      }
      return index === 0 ? segment : `.${segment}`;
    })
    .join('');
}
