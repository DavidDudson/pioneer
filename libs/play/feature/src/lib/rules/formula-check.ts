import { FormulaText, parseFormula, printFormula } from '@pioneer/rules/formula';
import type { TextPosition } from '@pioneer/rules/formula';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CheckStatus } from './rules-check';

const JSON_INDENT = 2;
const CARET = '^';
/** Anything but a tab becomes a space, so the caret lines up under tabbed text too. */
const NOT_TAB = /[^\t]/gu;

export type FormulaCheck =
  /** `canonical` is the formula as Pioneer prints it; `tree` is the parsed tree as JSON, positions included. */
  | { readonly status: typeof CheckStatus.Valid; readonly canonical: string; readonly tree: string }
  /** `pointer` is the text with a caret line under the character at `position`. */
  | {
      readonly status: typeof CheckStatus.Invalid;
      readonly error: MessageDescriptor;
      readonly position: TextPosition;
      readonly pointer: string;
    };

/** The text, then a line with a caret under the 1-based `position` (one past the end for "ends too early"). */
export function pointAt(text: string, position: TextPosition): string {
  const lead = text.slice(0, position - 1).replace(NOT_TAB, ' ');
  return `${text}\n${lead}${CARET}`;
}

/** Parse `text` as a formula. Never throws. */
export function checkFormula(text: string): FormulaCheck {
  const outcome = parseFormula(FormulaText.parse(text));
  if (!outcome.ok) {
    const { error, position } = outcome;
    return { status: CheckStatus.Invalid, error, position, pointer: pointAt(text, position) };
  }
  return {
    status: CheckStatus.Valid,
    canonical: printFormula(outcome.formula),
    tree: JSON.stringify(outcome.formula, undefined, JSON_INDENT),
  };
}
