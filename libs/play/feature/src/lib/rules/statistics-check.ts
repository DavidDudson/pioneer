import { BaseTermKind, deriveStatistics, StatisticInputsJson, TermSign } from '@pioneer/rules/engine';
import type { BaseTerm, RuleId, RuleInPlay, StatisticInputs, StatisticResult } from '@pioneer/rules/engine';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { RuleElement, StatisticDefinition } from '@pioneer/rules/sdk';
import type { Selector } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { lineRow, overrideRow, ruleNames, RuleSource, rulesInPlay } from './breakdown-lines';
import type { LineRow, OverrideRow, RuleName } from './breakdown-lines';
import { pointAt } from './point-at';
import { parseFacts } from './predicate-verdict';
import { CheckStatus, readJson } from './rules-check';
import type { JsonProblem, JsonRead } from './rules-check';

const JSON_INDENT = 2;

/** Inputs the example starts with: a level 3 fighter in a breastplate, trained in arcane spells. */
export const EXAMPLE_STATISTIC_INPUTS = JSON.stringify(
  {
    level: 3,
    attributes: { str: 4, dex: 2, con: 2, int: 1, wis: 1, cha: 0 },
    ranks: { ac: 'trained', 'save:fortitude': 'expert', 'spell-attack:arcane': 'trained' },
    dexterityCap: 1,
  },
  undefined,
  JSON_INDENT,
);

const Definitions = z.array(StatisticDefinition);

const RuleElementList = z.array(RuleElement);

/** Rule elements the example starts with: armor, a weaker item bonus, a shield not raised, cover, frightened. */
export const EXAMPLE_RULE_ELEMENTS = JSON.stringify(
  [
    { key: 'FlatModifier', selectors: ['ac'], type: 'item', value: 4, display: { label: 'Breastplate' } },
    { key: 'FlatModifier', selectors: ['ac'], type: 'item', value: 1, display: { label: 'Mage Armor' } },
    {
      key: 'FlatModifier',
      selectors: ['ac'],
      type: 'circumstance',
      value: 2,
      predicate: ['self:effect:raise-a-shield'],
      display: { label: 'Raise a Shield' },
    },
    {
      key: 'FlatModifier',
      selectors: ['ac'],
      type: 'circumstance',
      value: 2,
      predicate: ['terrain:forest'],
      display: { label: 'Undergrowth' },
    },
    {
      key: 'FlatModifier',
      selectors: ['all'],
      type: 'status',
      value: -1,
      predicate: ['self:condition:frightened'],
      display: { label: 'Frightened 1' },
    },
  ],
  undefined,
  JSON_INDENT,
);

/** Overrides the example starts with: a GM's blessing on Fortitude, and a spell DC set by hand. */
export const EXAMPLE_OVERRIDES = JSON.stringify(
  [
    { key: 'FlatModifier', selectors: ['save:fortitude'], type: 'status', value: 1, display: { label: 'GM blessing' } },
    { key: 'Change', selector: 'spell-dc:arcane', mode: 'override', value: 18, display: { label: 'Set by the GM' } },
  ],
  undefined,
  JSON_INDENT,
);

/** One line of a base as the playground shows it: the term with its sign, or rounding; and what it adds. */
export interface TermLine {
  /** The term as written with its sign (`+ @prof.ac`), the first without a plus; undefined for rounding. */
  readonly code: string | undefined;
  readonly value: number;
}

/**
 * A statistic's base terms, lines, overrides and totals, or its error with a caret under the reference or node
 * that failed.
 */
/** A statistic that derived. */
export type DerivedRow = Extract<StatisticRow, { readonly ok: true }>;

export type StatisticRow =
  | {
      readonly ok: true;
      readonly selector: Selector;
      readonly baseValue: number;
      readonly computed: number;
      readonly total: number;
      /** The set override that pinned the total, if one did. */
      readonly pinnedBy: RuleName | undefined;
      readonly terms: readonly TermLine[];
      readonly lines: readonly LineRow[];
      readonly overrides: readonly OverrideRow[];
    }
  | { readonly ok: false; readonly selector: Selector; readonly error: MessageDescriptor; readonly pointer: string };

export const StatisticsStatus = { Valid: CheckStatus.Valid, Problems: 'problems' } as const;
export type StatisticsStatus = ValueOf<typeof StatisticsStatus>;

/** The texts the statistics tool reads. */
export interface StatisticsTexts {
  readonly definitions: string;
  readonly inputs: string;
  readonly rules: string;
  /** Rule elements a user put on the character by hand: adjust (modifiers) and set (`Change` override). */
  readonly overrides: string;
  /** Roll options, one per line, shared with the verdict tool. */
  readonly facts: string;
}

export type StatisticsCheck =
  | { readonly status: typeof StatisticsStatus.Valid; readonly rows: readonly StatisticRow[] }
  /** Some text does not read; each problem is undefined when its text is fine. */
  | {
      readonly status: typeof StatisticsStatus.Problems;
      readonly definitions: JsonProblem | undefined;
      readonly inputs: JsonProblem | undefined;
      readonly rules: JsonProblem | undefined;
      readonly overrides: JsonProblem | undefined;
      /** The 1-based roll option lines that are not roll options; empty when they all are. */
      readonly factLines: readonly number[];
    };

function termLine(term: BaseTerm, index: number): TermLine {
  if (term.kind === BaseTermKind.Rounding) {
    return { code: undefined, value: term.value };
  }
  const leading = index === 0 && term.sign === TermSign.Plus;
  return { code: leading ? term.formula : `${term.sign} ${term.formula}`, value: term.value };
}

function rowOf(result: StatisticResult, base: string, names: ReadonlyMap<RuleId, RuleName>): StatisticRow {
  return result.ok
    ? {
        ok: true,
        selector: result.selector,
        baseValue: result.baseValue,
        computed: result.computed,
        total: result.total,
        pinnedBy: result.pinnedBy === undefined ? undefined : names.get(result.pinnedBy),
        terms: result.base.map((term, index) => termLine(term, index)),
        lines: result.lines.map((line) => lineRow(line, names)),
        overrides: result.overrides.map((line) => overrideRow(line, names)),
      }
    : { ok: false, selector: result.selector, error: result.error, pointer: pointAt(base, result.position) };
}

function problemOf<Value>(read: JsonRead<Value>): JsonProblem | undefined {
  return read.status === CheckStatus.Valid ? undefined : read;
}

/** Every text read: the values, or what is wrong with each text that does not read. */
type TextsRead =
  | {
      readonly ok: true;
      readonly definitions: readonly StatisticDefinition[];
      readonly inputs: StatisticInputs;
      readonly rules: readonly RuleInPlay[];
      readonly facts: PredicateFacts;
    }
  | { readonly ok: false; readonly problems: Extract<StatisticsCheck, { status: typeof StatisticsStatus.Problems }> };

function readTexts(texts: StatisticsTexts): TextsRead {
  const definitions = readJson(Definitions, texts.definitions);
  const inputs = readJson(StatisticInputsJson, texts.inputs);
  const elements = readJson(RuleElementList, texts.rules);
  const overrides = readJson(RuleElementList, texts.overrides);
  const facts = parseFacts(texts.facts);
  if (
    definitions.status === CheckStatus.Valid &&
    inputs.status === CheckStatus.Valid &&
    elements.status === CheckStatus.Valid &&
    overrides.status === CheckStatus.Valid &&
    'options' in facts
  ) {
    return {
      ok: true,
      definitions: definitions.value,
      inputs: inputs.value,
      rules: [...rulesInPlay(elements.value, RuleSource.Rule), ...rulesInPlay(overrides.value, RuleSource.Override)],
      facts: new PredicateFacts(facts.options),
    };
  }
  return {
    ok: false,
    problems: {
      status: StatisticsStatus.Problems,
      definitions: problemOf(definitions),
      inputs: problemOf(inputs),
      rules: problemOf(elements),
      overrides: problemOf(overrides),
      factLines: 'lines' in facts ? facts.lines : [],
    },
  };
}

/**
 * Read the definitions, the character's inputs, the rule elements and the overrides as JSON and the roll options
 * as lines, then derive every statistic's breakdown. Never throws.
 */
export function checkStatistics(texts: StatisticsTexts): StatisticsCheck {
  const read = readTexts(texts);
  if (!read.ok) {
    return read.problems;
  }
  const names = ruleNames(read.rules);
  const bases = new Map(read.definitions.map((definition) => [definition.selector, definition.base]));
  const results = deriveStatistics(read.definitions, read.inputs, { rules: read.rules, facts: read.facts });
  // Rows follow the order the statistics were written in; a selector written twice shows once.
  const rows = [...bases].flatMap(([selector, base]) => {
    const result = results.get(selector);
    return result === undefined ? [] : [rowOf(result, base, names)];
  });
  return { status: StatisticsStatus.Valid, rows };
}
