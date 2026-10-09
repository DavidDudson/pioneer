import { evaluate, FormulaText, parseFormula, printFormula, references } from '@pioneer/rules/formula';
import type { FormulaValue, ReferencePath, TextPosition } from '@pioneer/rules/formula';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { resolverFor } from './reference-values';
import type { ReferenceEntries } from './reference-values';
import { CheckStatus } from './rules-check';

export type { ReferenceEntries } from './reference-values';

const JSON_INDENT = 2;
const CARET = '^';
/** Anything but a tab becomes a space, so the caret lines up under tabbed text too. */
const NOT_TAB = /[^\t]/gu;
const NEWLINE = '\n';

/** A mistake in the formula: the descriptor, where it is, and the text with a caret line under it. */
interface FormulaMistake {
  readonly status: typeof CheckStatus.Invalid;
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
  readonly pointer: string;
}

/** The formula's value with the reference values given, or the mistake that stopped it. */
type FormulaEvaluation = { readonly status: typeof CheckStatus.Valid; readonly value: FormulaValue } | FormulaMistake;

export type FormulaCheck =
  /**
   * `canonical` is the formula as Pioneer prints it; `tree` is the parsed tree as JSON, positions included;
   * `references` lists each reference path once, in the order first written.
   */
  | {
      readonly status: typeof CheckStatus.Valid;
      readonly canonical: string;
      readonly tree: string;
      readonly references: readonly ReferencePath[];
      readonly evaluation: FormulaEvaluation;
    }
  | FormulaMistake;

/**
 * The text with a caret line under the 1-based `position` (one past the end for "ends too early"). The caret
 * line goes straight after the line holding the position, so multi-line text points at the right line.
 */
export function pointAt(text: string, position: TextPosition): string {
  const index = position - 1;
  const lineStart = text.lastIndexOf(NEWLINE, index - 1) + 1;
  const nextNewline = text.indexOf(NEWLINE, index);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const lead = text.slice(lineStart, index).replace(NOT_TAB, ' ');
  return `${text.slice(0, lineEnd)}\n${lead}${CARET}${text.slice(lineEnd)}`;
}

function mistake(text: string, error: MessageDescriptor, position: TextPosition): FormulaMistake {
  return { status: CheckStatus.Invalid, error, position, pointer: pointAt(text, position) };
}

/** Parse `text` as a formula and evaluate it with the reference values in `entries`. Never throws. */
export function checkFormula(text: string, entries: ReferenceEntries): FormulaCheck {
  const parsed = parseFormula(FormulaText.parse(text));
  if (!parsed.ok) {
    return mistake(text, parsed.error, parsed.position);
  }
  const { formula } = parsed;
  const outcome = evaluate(formula, resolverFor(entries));
  return {
    status: CheckStatus.Valid,
    canonical: printFormula(formula),
    tree: JSON.stringify(formula, undefined, JSON_INDENT),
    references: [...new Set(references(formula).map((found) => found.path))],
    evaluation: outcome.ok
      ? { status: CheckStatus.Valid, value: outcome.value }
      : mistake(text, outcome.error, outcome.position),
  };
}
