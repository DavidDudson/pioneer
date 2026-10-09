import type { TextPosition } from '@pioneer/rules/formula';

const CARET = '^';
/** Anything but a tab becomes a space, so the caret lines up under tabbed text too. */
const NOT_TAB = /[^\t]/gu;
const NEWLINE = '\n';

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
