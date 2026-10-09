import { BaseTermKind, deriveStatistics, StatisticInputsJson, TermSign } from '@pioneer/rules/engine';
import type { BaseTerm, RuleId, StatisticResult } from '@pioneer/rules/engine';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { RuleElement, StatisticDefinition } from '@pioneer/rules/sdk';
import type { Selector } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { lineRow, ruleNumbers, rulesInPlay } from './breakdown-lines';
import type { LineRow } from './breakdown-lines';
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

/** One line of a base as the playground shows it: the term with its sign, or rounding; and what it adds. */
export interface TermLine {
  /** The term as written with its sign (`+ @prof.ac`), the first without a plus; undefined for rounding. */
  readonly code: string | undefined;
  readonly value: number;
}

/** A statistic's base terms, lines and total, or its error with a caret under the reference or node that failed. */
export type StatisticRow =
  | {
      readonly ok: true;
      readonly selector: Selector;
      readonly baseValue: number;
      readonly total: number;
      readonly terms: readonly TermLine[];
      readonly lines: readonly LineRow[];
    }
  | { readonly ok: false; readonly selector: Selector; readonly error: MessageDescriptor; readonly pointer: string };

export const StatisticsStatus = { Valid: CheckStatus.Valid, Problems: 'problems' } as const;
export type StatisticsStatus = ValueOf<typeof StatisticsStatus>;

/** The four texts the statistics tool reads. */
export interface StatisticsTexts {
  readonly definitions: string;
  readonly inputs: string;
  readonly rules: string;
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

function rowOf(result: StatisticResult, base: string, numbers: ReadonlyMap<RuleId, number>): StatisticRow {
  return result.ok
    ? {
        ok: true,
        selector: result.selector,
        baseValue: result.baseValue,
        total: result.total,
        terms: result.base.map((term, index) => termLine(term, index)),
        lines: result.lines.map((line) => lineRow(line, numbers)),
      }
    : { ok: false, selector: result.selector, error: result.error, pointer: pointAt(base, result.position) };
}

function problemOf<Value>(read: JsonRead<Value>): JsonProblem | undefined {
  return read.status === CheckStatus.Valid ? undefined : read;
}

/**
 * Read the definitions, the character's inputs and the rule elements as JSON and the roll options as lines, then
 * derive every statistic's breakdown. Never throws.
 */
export function checkStatistics(texts: StatisticsTexts): StatisticsCheck {
  const definitions = readJson(Definitions, texts.definitions);
  const inputs = readJson(StatisticInputsJson, texts.inputs);
  const elements = readJson(RuleElementList, texts.rules);
  const facts = parseFacts(texts.facts);
  if (
    definitions.status !== CheckStatus.Valid ||
    inputs.status !== CheckStatus.Valid ||
    elements.status !== CheckStatus.Valid ||
    'lines' in facts
  ) {
    return {
      status: StatisticsStatus.Problems,
      definitions: problemOf(definitions),
      inputs: problemOf(inputs),
      rules: problemOf(elements),
      factLines: 'lines' in facts ? facts.lines : [],
    };
  }
  const rules = rulesInPlay(elements.value);
  const numbers = ruleNumbers(rules);
  const bases = new Map(definitions.value.map((definition) => [definition.selector, definition.base]));
  const results = deriveStatistics(definitions.value, inputs.value, {
    rules,
    facts: new PredicateFacts(facts.options),
  });
  // Rows follow the order the statistics were written in; a selector written twice shows once.
  const rows = [...bases].flatMap(([selector, base]) => {
    const result = results.get(selector);
    return result === undefined ? [] : [rowOf(result, base, numbers)];
  });
  return { status: StatisticsStatus.Valid, rows };
}
