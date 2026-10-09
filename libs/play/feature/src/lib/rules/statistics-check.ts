import { BaseTermKind, deriveStatistics, StatisticInputsJson, TermSign } from '@pioneer/rules/engine';
import type { BaseTerm, StatisticResult } from '@pioneer/rules/engine';
import { StatisticDefinition } from '@pioneer/rules/sdk';
import type { Selector } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { pointAt } from './point-at';
import { CheckStatus, readJson } from './rules-check';
import type { JsonProblem } from './rules-check';

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

/** One line of a base as the playground shows it: the term with its sign, or rounding; and what it adds. */
interface TermLine {
  /** The term as written with its sign (`+ @prof.ac`), the first without a plus; undefined for rounding. */
  readonly code: string | undefined;
  readonly value: number;
}

/** A statistic's base terms and total, or its error with a caret under the reference or node that failed. */
export type StatisticRow =
  | { readonly ok: true; readonly selector: Selector; readonly total: number; readonly terms: readonly TermLine[] }
  | { readonly ok: false; readonly selector: Selector; readonly error: MessageDescriptor; readonly pointer: string };

export const StatisticsStatus = { Valid: CheckStatus.Valid, Problems: 'problems' } as const;
export type StatisticsStatus = ValueOf<typeof StatisticsStatus>;

export type StatisticsCheck =
  | { readonly status: typeof StatisticsStatus.Valid; readonly rows: readonly StatisticRow[] }
  /** Either text, or both, does not read; each problem is undefined when its text is fine. */
  | {
      readonly status: typeof StatisticsStatus.Problems;
      readonly definitions: JsonProblem | undefined;
      readonly inputs: JsonProblem | undefined;
    };

function termLine(term: BaseTerm, index: number): TermLine {
  if (term.kind === BaseTermKind.Rounding) {
    return { code: undefined, value: term.value };
  }
  const leading = index === 0 && term.sign === TermSign.Plus;
  return { code: leading ? term.formula : `${term.sign} ${term.formula}`, value: term.value };
}

function rowOf(result: StatisticResult, base: string): StatisticRow {
  return result.ok
    ? {
        ok: true,
        selector: result.selector,
        total: result.total,
        terms: result.base.map((term, index) => termLine(term, index)),
      }
    : { ok: false, selector: result.selector, error: result.error, pointer: pointAt(base, result.position) };
}

/**
 * Read `definitionsText` as a JSON array of statistic definitions and `inputsText` as the character's inputs, then
 * derive every statistic's base. Never throws.
 */
export function checkStatistics(definitionsText: string, inputsText: string): StatisticsCheck {
  const definitions = readJson(Definitions, definitionsText);
  const inputs = readJson(StatisticInputsJson, inputsText);
  if (definitions.status !== CheckStatus.Valid || inputs.status !== CheckStatus.Valid) {
    return {
      status: StatisticsStatus.Problems,
      definitions: definitions.status === CheckStatus.Valid ? undefined : definitions,
      inputs: inputs.status === CheckStatus.Valid ? undefined : inputs,
    };
  }
  const bases = new Map(definitions.value.map((definition) => [definition.selector, definition.base]));
  const results = deriveStatistics(definitions.value, inputs.value);
  // Rows follow the order the statistics were written in; a selector written twice shows once.
  const rows = [...bases].flatMap(([selector, base]) => {
    const result = results.get(selector);
    return result === undefined ? [] : [rowOf(result, base)];
  });
  return { status: StatisticsStatus.Valid, rows };
}
