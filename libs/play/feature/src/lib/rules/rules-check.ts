import { TextPosition } from '@pioneer/rules/formula';
import {
  Attribute,
  ContentEntry,
  ContentKind,
  contentId,
  Domain,
  Origin,
  PackId,
  Predicate,
  RichText,
  RollOption,
  RuleElement,
  Selector,
  Slug,
  SourceRef,
  StatisticDefinition,
  StatisticKind,
} from '@pioneer/rules/sdk';
import type { RegisteredKind } from '@pioneer/rules/sdk';
import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { EXAMPLE_CONTENT_ENTRIES } from './content-entry-examples';
import { EXAMPLE_GRANT_ENTRIES } from './grant-examples';
import { pointAt } from './point-at';
import { EXAMPLE_RICH_TEXT } from './rich-text-example';

/** The rules schemas the playground can check. */
export const RulesSchema = {
  Predicate: 'predicate',
  Selector: 'selector',
  Domain: 'domain',
  RollOption: 'roll-option',
  Source: 'source',
  Origin: 'origin',
  RuleElement: 'rule-element',
  Statistic: 'statistic',
  RichText: 'rich-text',
  ContentEntry: 'content-entry',
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
  [RulesSchema.Statistic]: StatisticDefinition,
  [RulesSchema.RichText]: RichText,
  [RulesSchema.ContentEntry]: ContentEntry,
};

/** Message keys for schema names, spelled out so the key check sees them. */
const RULES_SCHEMA_KEYS: Readonly<Record<RulesSchema, string>> = {
  [RulesSchema.Predicate]: 'play.rules.schema.predicate',
  [RulesSchema.Selector]: 'play.rules.schema.selector',
  [RulesSchema.Domain]: 'play.rules.schema.domain',
  [RulesSchema.RollOption]: 'play.rules.schema.rollOption',
  [RulesSchema.Source]: 'play.rules.schema.source',
  [RulesSchema.Origin]: 'play.rules.schema.origin',
  [RulesSchema.RuleElement]: 'play.rules.schema.ruleElement',
  [RulesSchema.Statistic]: 'play.rules.schema.statistic',
  [RulesSchema.RichText]: 'play.rules.schema.richText',
  [RulesSchema.ContentEntry]: 'play.rules.schema.contentEntry',
};

/**
 * What the playground does: check JSON against one of the rules schemas, parse formula text, evaluate a predicate,
 * derive statistics, or resolve grants.
 */
export const RulesTool = {
  ...RulesSchema,
  Formula: 'formula',
  Verdict: 'verdict',
  Statistics: 'statistics',
  Grants: 'grants',
} as const;
export type RulesTool = ValueOf<typeof RulesTool>;

export const RULES_TOOL_KEYS: Readonly<Record<RulesTool, string>> = {
  ...RULES_SCHEMA_KEYS,
  [RulesTool.Formula]: 'play.rules.schema.formula',
  [RulesTool.Verdict]: 'play.rules.schema.verdict',
  [RulesTool.Statistics]: 'play.rules.schema.statistics',
  [RulesTool.Grants]: 'play.rules.schema.grants',
};

const PLAYER_CORE = PackId.parse('player-core');
const playerCoreId = (slug: string): string => contentId(PLAYER_CORE, Slug.parse(slug));
const playerCorePage = { kind: 'book', book: 'player-core', page: 1 };
const JSON_INDENT = 2;
/** The level the example predicate tests for. */
const EXAMPLE_LEVEL = 5;
/** Raise a Shield's circumstance bonus to AC. */
const RAISED_SHIELD_BONUS = 2;

/** A statistic base formula: AC from capped Dexterity and the AC proficiency bonus, which includes level. */
const EXAMPLE_FORMULA = '10 + @attr.dex.capped + @prof.ac';

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
  [RulesSchema.Statistic]: {
    slug: 'armor-class',
    name: 'Armor Class',
    selector: 'ac',
    domains: ['dex-based'],
    base: EXAMPLE_FORMULA,
    kind: StatisticKind.Dc,
    keyAttribute: Attribute.Dexterity,
  },
  [RulesSchema.RichText]: EXAMPLE_RICH_TEXT,
  [RulesSchema.ContentEntry]: EXAMPLE_CONTENT_ENTRIES[ContentKind.Ancestry],
};

/** Statistics for the statistics tool: AC, a save, and a spell DC that reads the spell attack modifier. */
const EXAMPLE_STATISTICS = [
  EXAMPLE_VALUES[RulesSchema.Statistic],
  {
    slug: 'fortitude',
    name: 'Fortitude',
    selector: 'save:fortitude',
    domains: ['saving-throw', 'con-based'],
    base: '@attr.con + @prof.save.fortitude',
    kind: StatisticKind.Check,
    keyAttribute: Attribute.Constitution,
  },
  {
    slug: 'arcane-spell-attack',
    name: 'Arcane spell attack modifier',
    selector: 'spell-attack:arcane',
    domains: ['spell-attack-roll'],
    base: '@attr.int + @prof.spell-attack.arcane',
    kind: StatisticKind.Check,
    keyAttribute: Attribute.Intelligence,
  },
  {
    slug: 'arcane-spell-dc',
    name: 'Arcane spell DC',
    selector: 'spell-dc:arcane',
    domains: ['spell-dc'],
    base: '10 + @stat.spell-attack.arcane',
    kind: StatisticKind.Dc,
  },
];

/** The example entry of `kind` as JSON, for the content entry mode's example picker. */
export function contentEntryExample(kind: RegisteredKind): string {
  return JSON.stringify(EXAMPLE_CONTENT_ENTRIES[kind], undefined, JSON_INDENT);
}

/** A valid starting text per tool: JSON for a schema, formula text for formulas, a predicate to evaluate. */
export function rulesExample(tool: RulesTool): string {
  if (tool === RulesTool.Formula) {
    return EXAMPLE_FORMULA;
  }
  if (tool === RulesTool.Statistics) {
    return JSON.stringify(EXAMPLE_STATISTICS, undefined, JSON_INDENT);
  }
  if (tool === RulesTool.Grants) {
    return EXAMPLE_GRANT_ENTRIES;
  }
  const schema = tool === RulesTool.Verdict ? RulesSchema.Predicate : tool;
  return JSON.stringify(EXAMPLE_VALUES[schema], undefined, JSON_INDENT);
}

export const CheckStatus = { Valid: 'valid', NotJson: 'not-json', Invalid: 'invalid' } as const;
export type CheckStatus = ValueOf<typeof CheckStatus>;

export type CheckOutcome =
  /** `parsed` is the validated value encoded back to JSON, as Pioneer would store or send it. */
  | { readonly status: typeof CheckStatus.Valid; readonly parsed: string }
  | { readonly status: typeof CheckStatus.NotJson }
  | { readonly status: typeof CheckStatus.Invalid; readonly issues: readonly CheckIssue[] };

/** A problem with the checked value; one in a formula also has the formula with a caret under the mistake. */
interface CheckIssue extends FieldIssue {
  readonly pointer?: string;
}

type JsonParse = { readonly ok: true; readonly value: unknown } | { readonly ok: false };

function parseJson(text: string): JsonParse {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** The value at `path` inside `value`, or undefined when the path leads nowhere. */
function valueAt(value: unknown, path: FieldIssue['path']): unknown {
  let inside = value;
  for (const segment of path) {
    inside = typeof inside === 'object' && inside !== null ? Reflect.get(inside, segment) : undefined;
  }
  return inside;
}

/**
 * The issue, with a pointer when its descriptor names a formula position (`FormulaSource`) and the field holds
 * the formula's text.
 */
function withPointer(json: unknown, issue: FieldIssue): CheckIssue {
  const formula = valueAt(json, issue.path);
  const position = TextPosition.safeParse(issue.message.params?.['position']);
  return typeof formula === 'string' && position.success
    ? { ...issue, pointer: pointAt(formula, position.data) }
    : issue;
}

/** What stops JSON text from reading: it is not JSON, or the value has issues. */
export type JsonProblem = Exclude<CheckOutcome, { readonly status: typeof CheckStatus.Valid }>;

export type JsonRead<Value> = { readonly status: typeof CheckStatus.Valid; readonly value: Value } | JsonProblem;

/** Parse `text` as JSON, then decode it with `target`, pointing into formulas that fail. Never throws. */
export function readJson<Value>(target: z.ZodType<Value>, text: string): JsonRead<Value> {
  const json = parseJson(text);
  if (!json.ok) {
    return { status: CheckStatus.NotJson };
  }
  const result = target.safeParse(json.value);
  return result.success
    ? { status: CheckStatus.Valid, value: result.data }
    : {
        status: CheckStatus.Invalid,
        issues: fieldIssues(result.error.issues).map((issue) => withPointer(json.value, issue)),
      };
}

/** Parse `text` as JSON, then validate it against `schema`. Never throws. */
export function checkRulesJson(schema: RulesSchema, text: string): CheckOutcome {
  const target = SCHEMAS[schema];
  return checkOutcome(target, readJson(target, text));
}

/** A read as the check reports it: the value encoded back to JSON, or what stopped it. */
export function checkOutcome<Value>(target: z.ZodType<Value>, read: JsonRead<Value>): CheckOutcome {
  return read.status === CheckStatus.Valid
    ? { status: CheckStatus.Valid, parsed: JSON.stringify(z.encode(target, read.value), undefined, JSON_INDENT) }
    : read;
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
