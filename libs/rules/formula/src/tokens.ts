import { message } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { BinaryOperatorSchema } from './ast';
import type { BinaryOperator } from './ast';
import { FormulaError } from './formula-error';
import { FormulaMessage } from './messages';
import { TextPosition } from './units';
import type { FormulaText } from './units';

/** A slice of formula text, kept so errors can quote what was found. */
const Lexeme = z.string().brand<'FormulaLexeme'>();
type Lexeme = z.infer<typeof Lexeme>;

export const TokenKind = {
  Number: 'number',
  Reference: 'reference',
  Name: 'name',
  Operator: 'operator',
  Open: 'open',
  Close: 'close',
  Comma: 'comma',
} as const;
export type TokenKind = ValueOf<typeof TokenKind>;

interface TokenBase {
  readonly lexeme: Lexeme;
  readonly position: TextPosition;
}

/** Digits as written; the parser checks the range, where it can say which number is too large. */
interface NumberToken extends TokenBase {
  readonly kind: typeof TokenKind.Number;
}
/** `@` and the path after it, checked by the parser. */
interface ReferenceToken extends TokenBase {
  readonly kind: typeof TokenKind.Reference;
}
/** A bare word: a function name if `(` follows, a mistake otherwise. */
export interface NameToken extends TokenBase {
  readonly kind: typeof TokenKind.Name;
}
interface OperatorToken extends TokenBase {
  readonly kind: typeof TokenKind.Operator;
  readonly operator: BinaryOperator;
}
interface PunctuationToken extends TokenBase {
  readonly kind: typeof TokenKind.Open | typeof TokenKind.Close | typeof TokenKind.Comma;
}
export type Token = NumberToken | ReferenceToken | NameToken | OperatorToken | PunctuationToken;

/** Everything a formula is made of, one alternative per token kind; leading whitespace is skipped. */
const TOKEN =
  /\s*(?:(?<digits>\d+)|(?<reference>@[\w.-]*)|(?<name>[A-Za-z_]\w*)|(?<operator>[+\-*/])|(?<open>\()|(?<close>\))|(?<comma>,))/uy;
/** Whitespace, then either the end or the next character, which no token matched. */
const STRAY = /\s*(?<found>[\s\S]?)/uy;

function tokenOf(match: RegExpExecArray, lexeme: Lexeme, position: TextPosition): Token {
  const { digits, reference, name, operator, open, close } = match.groups ?? {};
  if (digits !== undefined) {
    return { kind: TokenKind.Number, lexeme, position };
  }
  if (reference !== undefined) {
    return { kind: TokenKind.Reference, lexeme, position };
  }
  if (name !== undefined) {
    return { kind: TokenKind.Name, lexeme, position };
  }
  if (operator !== undefined) {
    return { kind: TokenKind.Operator, lexeme, position, operator: BinaryOperatorSchema.parse(operator) };
  }
  if (open !== undefined) {
    return { kind: TokenKind.Open, lexeme, position };
  }
  return { kind: close === undefined ? TokenKind.Comma : TokenKind.Close, lexeme, position };
}

function tokenFrom(match: RegExpExecArray): Token {
  const [matched] = match;
  const lexeme = Lexeme.parse(matched.trimStart());
  // `match.index` is 0-based and includes the skipped whitespace.
  return tokenOf(match, lexeme, TextPosition.parse(match.index + matched.length - lexeme.length + 1));
}

/** Splits formula text into tokens, or throws a {@link FormulaError} at the first character that fits none. */
export function tokenize(text: FormulaText): Token[] {
  const tokens: Token[] = [];
  // A failed sticky match resets `lastIndex` to 0, so track where the last token ended.
  let end = 0;
  TOKEN.lastIndex = end;
  for (let match = TOKEN.exec(text); match !== null; match = TOKEN.exec(text)) {
    tokens.push(tokenFrom(match));
    end = TOKEN.lastIndex;
  }
  STRAY.lastIndex = end;
  const found = STRAY.exec(text)?.groups?.['found'] ?? '';
  if (found !== '') {
    // `lastIndex` is just past the stray character, which may be two code units (an emoji): step back to its start.
    const position = TextPosition.parse(STRAY.lastIndex - found.length + 1);
    throw new FormulaError(message(FormulaMessage.UnexpectedCharacter, { found, position }), position);
  }
  return tokens;
}
